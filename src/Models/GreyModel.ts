import { BufferGeometry, Material, Mesh, MeshPhongMaterial, NormalBufferAttributes, Object3DEventMap, PlaneGeometry } from "three";
import { fromArrayBuffer, ReadRasterResult } from "geotiff";
import { longitudeKeys } from "geolib";
import { Coordinate } from "../Coordinate/Coordinate";

class	GreyModel {
	private	token: string;
	private	data: ReadRasterResult;
	private	watcher: (payload: { what: string; data: Mesh<BufferGeometry<NormalBufferAttributes>, Material | Material[], Object3DEventMap>[]; }) => void;
	private	terrainMat: MeshPhongMaterial;
	private	terrainRasterBbox: number[];
	private	center: [lat: number, lon: number];

	constructor( token: string, watcher: (payload: { what: string; data: Mesh<BufferGeometry<NormalBufferAttributes>, Material | Material[], Object3DEventMap>[]; }) => void, center: [lat: number, lon: number] ) {
		this.token = token;
		this.watcher = watcher;
		this.data = {} as ReadRasterResult;
		this.terrainMat = new MeshPhongMaterial({ color: 'white', side: 2, wireframe: true });
		this.terrainRasterBbox = [];
		this.center = center;
	};

	public async	fetch( url: string ) {
		const	arrayBuffer = await fetch( url ).then( res => {
			if ( !res.ok ) {
				throw new Error( res.statusText );
			};
			const	ret = res.arrayBuffer();
			return ( ret );
		});

		const	rawData = await fromArrayBuffer( arrayBuffer );
		const	tifImg = await rawData.getImage();
		this.terrainRasterBbox = tifImg.getBoundingBox();
		const	data = await tifImg.readRasters({ interleave: true });

		this.data = data;
		if ( this.data ) {
			this.build();
		};
	};

	private async	build() {
		const	mesh = await this._build();

		this.watcher({ what: 'grey-dem', data: mesh })
	};

	private async	_build( heightScale = 30 ): Promise<Mesh[]> {
		const	data = this.data;
		const	{ width, height } = this.data;
		//const	start = { latitude: this.terrainRasterBbox[1], longitude: this.terrainRasterBbox[0], altitude: 0 };
		//const	end = {latitude: this.terrainRasterBbox[3], longitude: this.terrainRasterBbox[2], altitude: 0 };

		//const	leftBottom = new Coordinate( start, this.center ).ComputeWorldCoordinate();
		//const	rightTop = new Coordinate( end, this.center ).ComputeWorldCoordinate();
		//const	x = Math.abs( leftBottom.world.x - rightTop.world.x );
		//const	y = Math.abs( leftBottom.world.y - rightTop.world.y );
		//console.log( x, y );

		const	plane = new PlaneGeometry( width, height, width - 1, height - 1 );
		const	arrBuff = new Array( plane.attributes.position.count );//pour la taille de  l'array==> raion de performance autant travailler comme a l'epoque cest bien plus opti
		const	arr = arrBuff.fill( 1 );
		arr.forEach(( _element, index ) => {
			plane.attributes.position.setZ( index, (( data[index] as number / heightScale )) )
		});
		const	mesh = new Mesh( plane, this.terrainMat );
		mesh.userData = {isGrey: true};
		mesh.receiveShadow = true;

		return ([ mesh ]);
	};
};

export default	GreyModel;
