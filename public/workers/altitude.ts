import * as THREE from 'three';


self.onmessage = (event: MessageEvent) => {
	const { type, data } = event.data;

	if (type === 'calculate') {
		const result = performCalculation(data);
		self.postMessage(result);
	}
};

function performCalculation(data: any): number {
	console.log( data );
	return ( 0 );
}
