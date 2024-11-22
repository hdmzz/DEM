import ndarray from 'ndarray';
import getPixels from './GetPixels';
import { BboxType } from '../type';
import { BoundingBox } from '../HugoGeo';

type	Bbox = {
	feature: {
		type: string;
		geometry: {
			properties: {};
			type: string;
			coordinates: [number[][]];
		};
	};
	northWest: number[];//[number, number]
	southEast: number[];//[number, number]
}

class Fetch {
	/**
  * Calculates the unique zoom positions covered by the provided zoom positions.
  *
  * This function groups the provided zoom positions by their grandparent zoom position
  * (two zoom levels higher) and returns the unique grandparent zoom positions.
  *
  * @param zpCovered - An array of zoom position arrays, where each inner array represents a zoom position.
  * @returns An array of unique grandparent zoom position arrays.
  */
 static	getZoomPositionElevation(zpCovered: number[][]) {
		const elevations: { [key: string]: number[][] } = {};

		zpCovered.forEach(( zoomPos ) => {
			let	grandparent = [
				zoomPos[0]-2, Math.floor(zoomPos[1]/4), Math.floor(zoomPos[2]/4)];

			const	key = grandparent.join(',');

			if (elevations[key]) {
				elevations[key].push(zoomPos);
			} else {
				elevations[key] = [zoomPos];
			}
		});

		return (
			Object.keys(elevations)
			.map(triplet => triplet.split(',').map(num => parseFloat(num)))
		);
	};
//
	static	urlBuilder( bbox: BboxType ): string {
		let	ret = `https://data.geopf.fr/wfs/ows?SERVICE=WFS&REQUEST=GetFeature&typeName=BDTOPO_V3:batiment&VERSION=2.0.0&SRSNAME=EPSG:4326&outputFormat=application/json&BBOX=${bbox.northWest[0]},${bbox.southEast[1]},${bbox.southEast[0]},${bbox.northWest[1]},EPSG:4326`//BBox= ne sw
		return ( ret );

	};

//https://docs.mapbox.com/data/tilesets/guides/access-elevation-data/#mapbox-terrain-rgb
	static	getUri( zoomPos: number[], token: string, api: string): string {
		let	prefix = '';
		let	resFormat = '';

		switch ( api ) {
			case ( 'mapbox-terrain-rgb' ):
				prefix = 'https://api.mapbox.com/v4/mapbox.terrain-rgb';
				resFormat = '@2x.pngraw';
				break;
			case ( 'mapbox-satellite' ):
				prefix = 'https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles';
				resFormat = '@2x';
				break;
			default:
				console.log( "No Uri generated" );
				return ( '' );
		};
		return ( `${prefix}/${zoomPos.join('/')}${resFormat}?access_token=${token}`);
	};

/**
 * @param uri du DEM de Mapbox ou Photo
 * @returns une promesse contenant les valeur rgb des pixels du raster
 */
	static async	getRgbTile({ uri }: { uri: string; }): Promise<ndarray.NdArray<Uint8Array>> {
		return new Promise(( res, rej ) => {
			getPixels( uri, ( err: any, pixels: ndarray.NdArray<Uint8Array> ) => {
				if ( err ) {
					rej( err );
				} else {
					res( pixels );
				};
			});
		});
	};

	static async	fetchTile( zoomPos: number[], token: string, api: string ) {
		const	uri: string  = this.getUri( zoomPos, token, api );
		let		ret = await this.getRgbTile({ uri });
		return ( ret );
	};

	//https://portal.opentopography.org/apidocs/#/Public/getGlobalDem ==> go get some 
	static	greyModelUrlBuilder( bbox: BoundingBox, token: string ): string {
		let		res = `https://portal.opentopography.org/API/globaldem?demtype=SRTMGL1_E&south=${bbox.south}&north=${bbox.north}&west=${bbox.west}&east=${bbox.est}&outputFormat=GTiff&API_Key=${token}`;
		console.log( res );
		return ( res );
	}
};
export default	Fetch;
