import ndarray from 'ndarray';

//idee  number one creer un canvas et une nouvelle img
//au chargement
//recuperer le context 2d puis dessiner grace au context dans le canva
//une fois que cest fait il suffit d'utiliser la methode getImageDatadu context
//puis onn peut construire un n-dimension-array avec les donnees
/**
 * 
 * @param url of the image from ;;apbox
 * @param type not mandatoruy for now i doont care
 * @param cb cll back take  error to  define in the when we call the function
 *! e. g : getPixels( url, 'png', ( err, res ) => return ( res ) );
 */
export default function	getPixels( url: string, cb: Function, _type?: string ) {
	const	image = new Image();
	image.crossOrigin =  'Anonymous';
	image.onload = () => {
		const	canvas = document.createElement('canvas');
		canvas.width = image.width;
		canvas.height = image.height;
		const	ctxt = canvas.getContext('2d');
		ctxt?.drawImage( image, 0, 0 );
		const pixels = ctxt?.getImageData( 0, 0, image.width, image.height );
		if ( pixels === undefined )
			throw new Error( 'pixels undefined' );
		const	array = new Uint8Array( pixels.data );
		const	ndArr = ndarray( array, [image.width, image.height, 4], [4, 4 * image.width, 1], 0);
		cb( null , ndArr );
	};

	image.onerror = (err) => {
		cb( err, null );
	};

	image.src = url;
}
