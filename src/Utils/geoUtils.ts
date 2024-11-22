import * as turfHelpers from '@turf/helpers';
import turfDestination from '@turf/destination';

class	Utils {

	static createTurfPoint( latLon: [number, number]) {
		return turfHelpers.point([latLon[1], latLon[0]]);
	};

	static	originRadiusToBbox( origin: [lat: number, lon: number], radius: number ): [number, number, number, number] {
		const	[w, n] = turfDestination( this.createTurfPoint( origin ), radius, -45, "kilometers" ).geometry.coordinates;
		const	[e, s] = turfDestination( this.createTurfPoint( origin ), radius, 135, "kilometers" ).geometry.coordinates;

		return ( [w, s, e, n] );
	};
};

export default	( Utils );
