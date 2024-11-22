function	mercator( lat: number, lon: number ) {
	const	mercator = { x: 0, y: 0 };
	const	earthRad = 6378.137;
	const	a = lat * Math.PI / 180;

	mercator.x = lon * Math.PI / 180 * earthRad;
	mercator.y = earthRad / 2 * Math.log((1.0 + Math.sin(a)) / (1.0 - Math.sin(a)));
	
	return ( mercator );
};

class GPSCoordinate {
	latitude: number;
	longitude: number;
	altitude: number;

	constructor (latitude: number, longitude: number, altitude: number) {
		this.latitude = latitude;
		this.longitude = longitude;
		this.altitude = altitude;
	}
};

export class Coordinate {
	world: { x: number, y: number, z: number };
	gps: GPSCoordinate;
	scale: number;
	center: { latitude: number, longitude: number };

	constructor ( coor: { latitude: number, longitude: number, altitude: number }, center: [number, number] ) {
		this.world = { x: 0, y: 0, z: 0 };
		this.gps = new GPSCoordinate( coor.latitude, coor.longitude, coor.altitude );
		this.scale = 1;
		this.center = {latitude: center[0], longitude: center[1] };
	};

/**
	 * Compute GPS/WGS84 Coordinate to Threejs World Postion Relatively to Center Coordinate
	 * @public
	 */

	ComputeWorldCoordinate () {
		const	obj = mercator( this.gps.latitude, this.gps.longitude );

		const	center = mercator(this.center.latitude, this.center.longitude);
		this.world.x = ( center.x - obj.x ) * this.scale;
		this.world.y = ( center.y - obj.y ) * this.scale;
		this.world.z = this.gps.altitude;

		return ( this );
	};
};
