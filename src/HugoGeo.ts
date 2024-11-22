import * as THREE from 'three';
import Utils from './Utils/geoUtils';
import cover from '@mapbox/tile-cover';
import RgbModel from './Models/RgbModel';
import { PolygonFeature } from './type';
import Fetch from './Fetcher/Fetch';
import GreyModel from './Models/GreyModel';

export interface	BoundingBox {
	north: number;
	south: number;
	est: number;
	west: number;
}

class	HugoGeo {
	public	unitsSide: number;
	public	isNode: boolean;
	public	apiVector: string;
	public	apiRgb: string;
	public	apiSatellite: string;
	private	tokenMapBox: string;
	private	tokenOpenTopo: string;

	constructor( opts: { tokenMapBox: string, tokenOpenTopo: string } ) {
		this.unitsSide = 10;
		this.isNode = false;
		this.apiVector = "mapbox-terrain-vector";
		this.apiRgb = "mapbox-terrain-rgb";
		this.apiSatellite = "mapbox-satellite";
		this.tokenMapBox = opts.tokenMapBox;
		this.tokenOpenTopo = opts.tokenOpenTopo;
	};

	public async	getTerrainRgb( origin: [lat: number, lon:  number], radius: number, zoom: number ): Promise<THREE.Group> {
		const	meshes = await this.getTerrain(origin, radius, zoom);

		return (HugoGeo.createDemGroups( "dem-rgb", meshes ));
	}

	/**
	 * @origin = lat lon coordonnées
	 * @radius dans l'exemple 5 corresond au rayon de la tuile en km
	 * @zoom dans l'exemple 12 correspond a la valeur du zoom de la camera !! log neperien nombre d'images
	 * le res de la promesse doit etre donne au watcher
	 */
	private	getTerrain( origin: [lat: number, lon:  number], radius: number, zoom: number ): Promise<THREE.Mesh[]>{
		return new Promise(async ( res, rej ) => {
			try {
				const	watcher = this.createWatcher( res );
				const	unitsSide = this.unitsSide;
				const	unitsPerMeters = HugoGeo.getUnitsPerMeters( this.unitsSide, radius );
				const	projectCoords = ( coord: [number, number], nw: [number, number], se: [number, number] ) => {
					return HugoGeo.projectCoord( unitsSide, coord, nw, se );
				};
				const	{ tokenMapBox: token, apiSatellite, apiRgb } = this;
				const	bbox = HugoGeo.getBbox( origin, radius );
				const	zoomPositionCovered = HugoGeo.getZoomPositionCovered( bbox.feature, zoom );
				const	onSatMat = () => {}; //dummy function to trigger the satelite image fetch
				const	rgbModel = new RgbModel( unitsPerMeters, projectCoords, token, apiSatellite, apiRgb, watcher, onSatMat );

				rgbModel.fetch( zoomPositionCovered, bbox );
			} catch ( error ) {
				console.log( error );
				rej( error );
			};
		});
	};

	static	createDemGroups( name: string, objects: THREE.Mesh[] ): THREE.Group {
		const	group = new THREE.Group();

		if (!objects || objects.length === 0) {
			console.warn('No objects provided to createDemGroups');
			return group;
		}

		for ( let i = 0; i < objects.length; i++ ) {
			if (objects[i] instanceof THREE.Mesh) {
				objects[i].name = name;
				group.add( objects[i] );
			} else {
				console.warn(`Object at index ${i} is not a THREE.Mesh`);
			}
		}

		return group;
	};

	static	getUnitsPerMeters( unitsSide: number, radius: number ): number {
		return ( unitsSide / ( radius * ( 2**0.5 ) * 1000 ) );
	};

	static	projectCoord( unitsSide: number, coord: [number, number], nw: [number, number], se: [number, number]) {
		return [
			unitsSide * (-0.5 + (coord[0]-nw[0]) / (se[0]-nw[0])),
			unitsSide * (-0.5 - (coord[1]-se[1]) / (se[1]-nw[1]))
		];
	};

	/**
	 * @param origin lat lon
	 */
	static	getBbox( origin: [lat: number, lon: number], radius: number ): {
		feature: {
			type: string;
			geometry: {
				properties: {};
				type: string;
				coordinates: [number[][]];
			};
		};
		northWest: number[];
		southEast: number[];
	} {
		const testPolygon = {
			"type": "FeatureCollection",
			"features": [{
				"type": "Feature",
				"geometry": {
					"properties": {},
					"type": "Polygon",
					"coordinates": [[]] as unknown as [number[][]]
				},
			}],
		};
		const polygon = testPolygon.features[0];
		const [w, s, e, n] = Utils.originRadiusToBbox(origin, radius);
		const nw = [w, n], se = [e, s];
		polygon.geometry.coordinates[0] = [
			nw, [se[0], nw[1]], se, [nw[0], se[1]], nw
		];
		return {
			feature: polygon,
			northWest: nw,
			southEast: se,
		};
	};

	static	getZoomPositionCovered( polygon: PolygonFeature, zoom: number ): number[][] {
		const	limits = {
			min_zoom: zoom,
			max_zoom: zoom,
		};

		console.log( cover )
		
		return ( cover.tiles( polygon.geometry as GeoJSON.Geometry, limits ) )
		.map(( [x, y, z] ) => [z, x, y]);
	};
	
	private	createWatcher( finalCallBack:(value: THREE.Mesh<THREE.BufferGeometry>[]) => void): (payload: { what: string, data: THREE.Mesh[] }) => void {
		let		isRgbPending: boolean = true;
		let		isGreyPending: boolean = true;
		const	ret: { value: THREE.Mesh[] } = { value: [] }; // rgbDem will contain all the data
		const	isDone = () => !isRgbPending || !isGreyPending;

		if ( isDone() ) {
			finalCallBack( ret.value );
		}

		return (( payload: { what: string, data: THREE.Mesh[] } ) => {
			const	{ what, data } = payload;

			if ( what === 'rgb-dem' ) {
				isRgbPending = false;
				ret.value = data;
			};
			if ( what === 'grey-dem' ) {
				isGreyPending = false;
				ret.value = data;
			};
			if ( isDone() ) {
				console.log( 'watcher says all shit is done' );
				finalCallBack( ret.value );
			};
		});
	};

/**
 * Calculate the bounding box of a given point (lat, lon) and radius in kilometers.
 * @param {LatLon} point - Latitude and Longitude of the point.
 * @param {number} radius - Radius in kilometers.
 * @returns {BoundingBox} - The bounding box (minLat, maxLat, minLon, maxLon).
 */
	private	calculateBoundingBox( point: {lat: number, lon: number}, radius: number ): BoundingBox {
		// 1 degree of latitude is approximately 111.32 km
		const	latDegree = radius / 111; //0.045 environ
		const	lonDegree = radius / ( 111 * Math.cos(point.lat * (Math.PI / 180)));// 0.072

		const	north = point.lat + latDegree;
		const	south = point.lat - latDegree;
		const	est = point.lon + lonDegree;
		const	west = point.lon - lonDegree;

		return ({
			north,
			south,
			est,
			west,
		});
	};

	//get terrain greyscale
	public async	getTerrainGrey( origin: [lat: number, lon:  number], radius: number ): Promise<THREE.Mesh[]> {
		return new Promise( async ( resolve, reject ) => {
			try {
				const	watcher = this.createWatcher( resolve );
				const	bbox = HugoGeo.getBbox( origin, radius );
				console.log(bbox);
				const	bbox2 = this.calculateBoundingBox( {lat: origin[0], lon: origin[1]}, radius );
				console.log( bbox2 );
				const	url = Fetch.greyModelUrlBuilder( bbox2, this.tokenOpenTopo );
				const	mesh = await new GreyModel( this.tokenOpenTopo, watcher, origin ).fetch( url );
			} catch (error) {
				reject( error );
			};
		});
	};
};

export default	HugoGeo;
