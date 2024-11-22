import * as THREE from 'three';
import { GeoJSONFeature, GeoJSONFeatureCollection } from '../type';
import HugoGeo from '../HugoGeo';
import { Coordinate } from '../Coordinate/Coordinate';
import Fetch from '../Fetcher/Fetch';

import View from '../View/View';
import { BufferGeometryUtils } from 'three/examples/jsm/Addons.js';
const	coordinateCache: { [key: string]: Coordinate } = {};

export function	getWorldCoords( lat: number, lon: number, alt: number, center: [number, number] ) {
	const	cacheKey: string = `${lat},${lon},${alt},${center[0]},${center[1]}`;

	if ( coordinateCache[cacheKey] ) {
		return ( coordinateCache[cacheKey] );
	} else {
		coordinateCache[cacheKey] = new Coordinate({ latitude: lat, longitude: lon, altitude: alt }, center as [number, number]).ComputeWorldCoordinate();
		return	( coordinateCache[cacheKey] );
	};
};

class	Buildings {
	data: GeoJSONFeature | {};
	buildingsArray: [];
	center: [lat: number, lon: number];
	radius: number;
	terrain: THREE.Mesh[];
	view: View;

	constructor( center: [lat:number, lon: number], radius: number, terrain: THREE.Mesh[], view: View ) {
		this.data = {};
		this.buildingsArray = [];
		this.center = center;
		this.radius = radius;
		this.terrain = terrain;
		this.view = view;
	};

	public async	getBuildings( url: string ): Promise<GeoJSONFeature[]> {
		if ( !url ) {
			throw new Error( 'No url given!! getBuilding Function' );
		};

		const	data: GeoJSONFeatureCollection = await fetch( url ).then(( res ) => {
			if ( !res.ok ) {
				throw new Error( `Something happened maybe the url Given is not correct: ${res.status}` );
			};

			return ( res.json() )
		});

		return ( data.features );
	};

	public	shortest( point: THREE.Vector3, terrain: THREE.Mesh): number {
		const	terrainVertices = terrain.geometry.getAttribute('position').array;
		let		res: number | boolean = 0;
		let		resDis = 100000;
		
		for ( let i = 0; i < terrainVertices.length; i += 3 ) {
			//terrainVertices[i]  = x = abscisse;
			//terrainVertices[i + 1] = y = altitude;
			//terrian[i + 2] = z = ordonnee;
			let	dis = Math.sqrt((( point.x - terrainVertices[i] ) ** 2 ) + (( point.z - terrainVertices[i + 1] ) ** 2 ));
			if ( dis <= resDis ) {
				resDis = dis;
				res = terrainVertices[i + 2];
			};
		};

		return ( res );
	};

	public async	getAltitudeWithRaycast( building: THREE.ExtrudeGeometry ): Promise<number> {
		return new Promise( async ( resolve ) => {
			await new Promise(( resolve ) => setTimeout( resolve, 0 ));
			const	raycaster = new THREE.Raycaster();
			const	up = new THREE.Vector3( 0, 1, 0 );
			const	chunkSize = 5;
			let	altitude = 0;
	
			for ( let i =  0; i < this.terrain.length; i += chunkSize ) {
				const	terrainChunk = this.terrain.slice( i, i + chunkSize );
				raycaster.set(( building.boundingSphere?.center as THREE.Vector3 ), up );
				for ( const mesh of terrainChunk ) {
					const	intersects =  raycaster.intersectObject( mesh );
					if ( intersects.length > 0 ) {
						altitude = intersects[0].point.y;
						break;
					};
				};
			};
			resolve( altitude );
		});
	};

	public async	getAltitude( building: THREE.ExtrudeGeometry ): Promise<number> {
		let	altitude = 0;

		if ( this.terrain[0].userData.isRgb === true )
			altitude = await this.getAltitudeWithRaycast( building );
		else if ( this.terrain[0].userData.isGrey === true )
			altitude = this.shortest( building.boundingSphere?.center as THREE.Vector3, this.terrain[0] );

		return ( altitude );
	};

	public async	Building() {
		const	mat = new THREE.MeshPhongMaterial({ color: 'red', side: 2, wireframe: false });
		const	url = Fetch.urlBuilder(HugoGeo.getBbox( [...this.center], 0.5 ));
		const	buildings = await this.getBuildings( url );
		const	geometries: THREE.ExtrudeGeometry[] = [];
		const	meshes: THREE.Mesh[] = [];

		for ( let i = 0; i < buildings.length; i++ ) {
			const	featureElement = buildings[i];
			const	height = featureElement.properties.hauteur ? featureElement.properties.hauteur / 20: 0.01;
			const	building = await this.addBuilding( featureElement.geometry.coordinates, height );

			geometries.push( building );
		};

		for ( let i = 0; i < geometries.length; i++ ) {
			const	mesh = new THREE.Mesh( geometries[i], mat );

			mesh.castShadow = true;
			mesh.receiveShadow = true;
			meshes.push( mesh );
		};

		const	buildingGroup = HugoGeo.createDemGroups( 'Buildings', meshes );

		return ( buildingGroup );
	};

	public async	addBuilding( coords: number[][][][], height: number ): Promise<THREE.ExtrudeGeometry> {
		const	holes = [];
		let		shape: THREE.Shape | undefined;

		for ( let i = 0; i < coords.length; i++ ) {//ex 2
			const	el = coords[i];

			if ( i === 0 ) {
				shape = this.genShape( el );
			} else {
				holes.push( this.genShape( el ) );
			};
		};

		if ( shape ) {
			for ( let i = 0; i < holes.length; i++ ) {
				shape?.holes.push( holes[i] );
			};
		} else {
			throw new Error( "Shape was not init" );
		};

		const	geometry = await this.genGeometry( shape, { curveSegment: 1, depth: 0.1 * height, bevelEnabled: false } );

		return ( geometry );
	};

	public	genShape( points: number[][][] ): THREE.Shape {
		const	shape = new THREE.Shape();

		for ( let i = 0; i < points.length; i++ ) {
			const	elPoint = points[i];//

			elPoint.forEach(( point, y ) => {
				const	normPnt = getWorldCoords( point[1], point[0], point[2], this.center );

				if ( y === 0 ) {
					shape.moveTo( normPnt.world.x, normPnt.world.y );
				} else {
					shape.lineTo( normPnt.world.x, normPnt.world.y );
				};
			});
		};

		return ( shape );
	};

	public async	genGeometry( shape: THREE.Shape, extrudeSettings: { curveSegment: number, depth: number, bevelEnabled: boolean } ): Promise<THREE.ExtrudeGeometry> {
		return new Promise( async ( resolve ) => {
			const	geometry = new THREE.ExtrudeGeometry( shape, extrudeSettings );
			
			geometry.rotateX(Math.PI / 2);
			geometry.rotateZ(Math.PI);
			geometry.computeBoundingSphere();
			geometry.rotateY(-0.01)
			
			//geometry.translate(-0.01, 0, -0.05);
			const	altitude = await this.getAltitude( geometry );
			geometry.translate(0, altitude, 0);
	
			resolve( geometry );
		});
	};

};

export default	Buildings;
