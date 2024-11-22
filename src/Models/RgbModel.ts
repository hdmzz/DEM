import * as THREE from "three";
import ndarray from "ndarray";
import Fetch from "../Fetcher/Fetch";
import { SphericalMercator } from "@mapbox/sphericalmercator";
import { BboxType } from "../type";
import { BufferGeometryUtils } from "three/examples/jsm/Addons.js";

const	constVertices = 128;
//! Attention ll signifi lon lat ici et pas lat lon
const	constTilePixels = new SphericalMercator({size: 128});

const	computeSeamRows = ( shift: number ) => {
	let	totalCount = 49152; // 128 * 128 * 3
	let	rowCount = 384; // 128 * 3
	let	rows: number[][]= [[],[],[], []];
	for ( let c = 0; c < rowCount; c += 3 ) {
		// 0, 1, 2, 3; north, west, south, east; +y, -x, -y, +x
		rows[0].push( c + 1 + shift );
		rows[1].push( c / 3 * (rowCount) + 1 + shift );
		rows[2].push( c + 1 + totalCount - rowCount + shift );
		rows[3].push( (c / 3 + 1) * (rowCount) - 2 + shift );
	}
	return ( rows );
};

const	constSeamRows = computeSeamRows( 1 );

const	sixteenthPixelRanges = (() => {
	let	cols = 512;
	let	rows = 512;
	let	scaleFactor = 4;
	let	ranges = [];
	for ( let c = 0; c < scaleFactor; c++ ) {
		for ( let r = 0; r < scaleFactor; r++ ) {
			ranges.push([
				[ r * ( rows / scaleFactor - 1 ) + r, ( r + 1 ) * rows / scaleFactor ],
				[ c * ( cols / scaleFactor - 1 ) + c, ( c + 1 ) * cols / scaleFactor ]
			]);
		};
	};
	return ( ranges );
})();

type ProjectCoordsFunction = (coord: [number, number], nw: [number, number], se: [number, number]) => number[];

class	RgbModel {
	public	unitsPerMeter: number;
	public	projectCoords: ProjectCoordsFunction;
	public	mapBoxToken: string;
	public	dataElevationCovered: number[][][];
	public	apiSatellite: string;
	public	apiRgb: string;
	private	watcher: (payload: { what: string; data: THREE.Mesh[]; }) => void;
	private	onSatelliteMat: ( () => void ) | undefined;

	constructor (
			units: number,
			projectCoords: ProjectCoordsFunction,
			token: string, apiSatellite: string,
			apiRgb: string,
			watcher: (payload: { what: string, data: THREE.Mesh[] }) => void,
			onSatelliteMat?: () => void,
		) {
		this.mapBoxToken = token;
		this.projectCoords = projectCoords;
		this.unitsPerMeter = units;
		this.dataElevationCovered = [];
		this.apiSatellite = apiSatellite;
		this.apiRgb = apiRgb;
		this.watcher = watcher;
		if ( onSatelliteMat )
			this.onSatelliteMat = onSatelliteMat;
		else
			this.onSatelliteMat = undefined;
	};

	public	fetch( zpCovered: number[][], bbox: BboxType ): void {
		//calculer le zoomPositionElevation
		const	zoomPositionElevation = Fetch.getZoomPositionElevation( zpCovered );
		let	count = 0;
		
		zoomPositionElevation.forEach( async zoomPos => {
			const	tile = await Fetch.fetchTile( zoomPos, this.mapBoxToken, this.apiRgb );

			if ( tile !== null ) {
				this.dataElevationCovered = this.dataElevationCovered.concat( this.addTile( tile, zoomPos, zpCovered, bbox ) );
			} else {
				throw new Error( 'no tile added l-87 RgbModel' );
			};

			count++;
			if ( count === zoomPositionElevation.length ) {
				this.build();
			};
		});
	};

	public	addTile( tile: ndarray.NdArray<Uint8Array>, zoomPositionElevation: number[], zpCovered: number[][], bbox: BboxType ): number[][][] {
		let	elevations =  [];
		//ici extrcction de l'elevation
		if ( tile ) {
			let	R, G, B;
			for ( let i = 0; i < tile.data.length; i += 4 ) {//on avance de 4 car la  quatrieme valeur est la valeur alpha du pixel
				R = tile.data[i];
				G = tile.data[i + 1];
				B = tile.data[i + 2];
				elevations.push( -10000 + (( R * 256 ** 2 ) + ( G * 256 ) + B) * 0.1 );
			};
		} else {
			elevations = new Array( 262144 ).fill( 0 );//262144 ==> (256**2 * 4)
		};

		let	sixteenths = [];
		for ( let col = 0; col < 4; col++ ) {
			for ( let row = 0; row < 4; row++ ) {
				sixteenths.push([
					zoomPositionElevation[0] + 2,
					zoomPositionElevation[1] * 4 + col,
					zoomPositionElevation[2] * 4 + row,
				].join( '/' ));
			};
		};

		let	zpCoveredStr = zpCovered.map(( zp ) => { return zp.join('/'); });

		const	dataElev: number[][][] = [];
		sixteenths.forEach(( zoomPosStr, index ) => {
			if ( !zpCoveredStr.includes( zoomPosStr ) ) return;

			let	zoomPos = zoomPosStr.split( '/' ).map(( str ) => parseInt( str ));
			let	pxRange = sixteenthPixelRanges[index];
			let	elev = [];

			for ( let r = pxRange[0][0]; r < pxRange[0][1]; r++ ) {
				for ( let c = pxRange[1][0]; c < pxRange[1][1]; c++ ) {
					elev.push( elevations[r * 512 + c] );
				}
			}

			let	array = [];
			let	dataIndex = 0;
			for ( let row = 0; row < constVertices; row++ ) {
				for ( let col = 0; col < constVertices; col++ ) {
					let lonlatPixel = constTilePixels.ll([
						zoomPos[1] * 128 + col,
						zoomPos[2] * 128 + row
					], zoomPos[0]);

					array.push(
						...this.projectCoords( lonlatPixel, bbox.northWest as [number, number], bbox.southEast as [number, number] ),
						elev[dataIndex] * this.unitsPerMeter);
					dataIndex++;
				};
			};
			dataElev.push([ zoomPos, array, zoomPositionElevation ])
		});
		return ( dataElev );
	};

	//cette fonnction s'executera dans la boucle forEacch DataElevation 
	//c'est pour  cela qu on un compte de pour  verifier que les tuiles de 
	//lelevation ont bien ete fetche et sont bieng arrivees
	public async	build() {
		let		satCount = 0;
		let		onSatelliteMatWrapper = null;
		
		if ( this.onSatelliteMat !== undefined ) {
			onSatelliteMatWrapper = ( meshAcc: THREE.Mesh[] ) => {
				satCount++;
				if ( satCount === this.dataElevationCovered.length ) {
					this.watcher({ what: 'rgb-dem', data: meshAcc })
				};
			};
		};

		const	meshes = this._build( onSatelliteMatWrapper );

		if ( !onSatelliteMatWrapper )
			this.watcher({ what: 'rgb-dem', data: meshes });
	};

	private	_build(
			onSatelliteMatWrapper: ((meshAcc: THREE.Mesh[]) => void) | null
		): THREE.Mesh[] {
		const	{ dataElevationCovered: dataEl, apiSatellite, mapBoxToken } = this;

		//first sort the data Ele
		dataEl.sort(( zp1, zp2 ) => {
			return ( zp1[0].join( "/" ) > zp2[0].join( "/" ) ? 1 : -1 );
		});

		//on index chaque valeurn et on les stock dans un tab nommé dataEleIds
		const	dataElIds: { [key: string]: number } = {};
		dataEl.forEach(( data, index ) => { dataElIds[data[0].join('/')] = index });

		const	objs: THREE.Mesh[] = [];
		const	geometries: THREE.BufferGeometry[] = [];

		dataEl.forEach(([ zoomPos, array, _zoomPosEle ]) => {
			let	cSegments = this.resolveSeams(
				array, this.getNeighborsInfo( dataEl, dataElIds, zoomPos )
			);

			const	geom = new THREE.PlaneGeometry( 1, 1, cSegments[0], cSegments[1] );

			geom.setAttribute(
				"position",
				new THREE.Float32BufferAttribute( new Float32Array( array ), 3 )
			);
			geom.computeBoundingBox();
			geometries.push( geom );

			const	plane = new THREE.Mesh(
				geom,
				new THREE.MeshPhongMaterial({
					color: 'white',
					//wireframe: true,
					side: 2,
				})
			);
			//plane.castShadow = true;
			plane.receiveShadow = true;
			plane.userData = {isRgb: true};

			//la raison de mettre plane dans objs est//qu'on en a besoin
			objs.push( plane );
			if ( onSatelliteMatWrapper !== null ) {
				this.resolveTexture(
					zoomPos,
					apiSatellite,
					mapBoxToken,
					( tex ) => {
						if ( tex ){
							plane.material = new THREE.MeshPhongMaterial({
								side: 2,// FrontSide
								map: tex,//DataTexture made of the pixels
								wireframe: false
							});
						};
						if ( onSatelliteMatWrapper ) {
							onSatelliteMatWrapper( objs );
						}
					},
				);
			};
		});

		const	mergedGeometrie =  BufferGeometryUtils.mergeGeometries( geometries, false );
		console.log( mergedGeometrie );

		return ( objs );
	};

	public	resolveSeams( array: number[], infoNei: { [key: number]: number[] } ) {
		let	cSegments = [ constVertices - 1, constVertices - 1 ];

		Object.entries( infoNei ).forEach(([ idxNei, arrayNei ]) => {
			if ( idxNei === "2" ) {
				this._stitchWithNei2( array, arrayNei );
				cSegments[1]++;
			} else if ( idxNei === "3" ) {
				this._stitchWithNei3( array, arrayNei );
				cSegments[0]++;
			};
		});

		if (cSegments[0] === constVertices &&
			cSegments[1] === constVertices) {
			let	arrayNei6 = infoNei["6"];
			if ( arrayNei6 ) {
				array.push( arrayNei6[0], arrayNei6[1], arrayNei6[2] );
			} else {
				// filling with a degenerated triangle
				let	len = array.length;
				array.push( array[len-3], array[len-2], array[len-1] );
			};
		};

		return ( cSegments );
	};

	//neighboring array => Nei
	public	_stitchWithNei2( array: number[], arrayNei: number[] ) {
		// add a new south row
		for ( let i = 0; i < constVertices; i++ ) {
			let indexZ = constSeamRows[2][i] + constVertices * 3; // new south row
			let indexZNei = constSeamRows[0][i];                // north row to copy
			array[indexZ-2] = arrayNei[indexZNei-2];            // a new x
			array[indexZ-1] = arrayNei[indexZNei-1];            // a new y
			array[indexZ] = arrayNei[indexZNei];                // a new z
		};
	};

	public	_stitchWithNei3( array: number[], arrayNei: number[] ) {
		// add a new east col
		for ( let i = 0; i < constVertices; i++ ) {
			let indexZ = constSeamRows[3][i] + ( 1 + i ) * 3;         // new east col
			let indexZNei = constSeamRows[1][i];                // west col to copy
			array.splice( indexZ-2, 0, arrayNei[indexZNei-2] );
			array.splice( indexZ-1, 0, arrayNei[indexZNei-1] );
			array.splice( indexZ, 0, arrayNei[indexZNei] );
		};
	};

	public	getNeighborsInfo( dataEle: number[][][], dataEleIds: {[key: string]: number}, zoomPos: number[] ): {[ key: number ]: number[]} {
		const	infoNei: {[ key: number ]: number[]} = {};
		this.getNeighbors8( zoomPos ).forEach(( zoomposNei, idxNei ) => {
			const id = zoomposNei.join( '/' );
			if ( id in dataEleIds ) {
				const arrayNei = dataEle[dataEleIds[id]][1];
				infoNei[idxNei] = arrayNei;
			};
		});
		return ( infoNei );
	}

	private	getNeighbors8( zoomPos: number[] ): number[][] {
		const	zoomposNeighborsDiff = [
			[0, 0, -1], [0, -1, 0], [0, 0, 1], [0, 1, 0],
			[0, -1, -1], [0, -1, 1], [0, 1, 1], [0, 1, -1],
		];
		const	neighbors: number[][] = [];
		zoomposNeighborsDiff.forEach(( zoomposDiff: number[] ) => {
			const	zoomposNei = zoomposDiff.map(
				( coord, idxCoord ) => coord + zoomPos[idxCoord]);
			// console.log('8-neighbor candidate:', zoomposNei);
			neighbors.push( zoomposNei );
		});
		return ( neighbors );
	};

	//on va choper le raster de couleur correspondant au zoomPos au momment ou on a les elevations et  tout ds la fonctioon build
	private async	resolveTexture(
		zoomPos: number[],
		apiSatellite: string,
		token:string,
		onTex: ( texture: THREE.DataTexture ) => void,
	) {
		const	pixels = await Fetch.fetchTile( zoomPos, token, apiSatellite );
		const	tex = new THREE.DataTexture( pixels.data, pixels.shape[0], pixels.shape[1], THREE.RGBAFormat );

		tex.flipY = true;
		tex.needsUpdate = true;
		if ( onTex ) {
			onTex( tex );
		};
	};
};


export default	RgbModel;
