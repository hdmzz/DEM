import * as THREE from 'three';


self.onmessage = (event) => {
	const { rayOrigin, rayDirection, meshPositions, meshIndices } = event.data;

	const ray = new THREE.Ray(rayOrigin, rayDirection);
	const raycaster = new THREE.Raycaster(rayOrigin, rayDirection);

	let altitude = 0;
	let altitudeFound = false;

	for (let i = 0; i < meshIndices.length; i += 3) {
		const v0 = new THREE.Vector3(
			meshPositions[meshIndices[i] * 3],
			meshPositions[meshIndices[i] * 3 + 1],
			meshPositions[meshIndices[i] * 3 + 2]
		);
		const v1 = new THREE.Vector3(
			meshPositions[meshIndices[i + 1] * 3],
			meshPositions[meshIndices[i + 1] * 3 + 1],
			meshPositions[meshIndices[i + 1] * 3 + 2]
		);
		const v2 = new THREE.Vector3(
			meshPositions[meshIndices[i + 2] * 3],
			meshPositions[meshIndices[i + 2] * 3 + 1],
			meshPositions[meshIndices[i + 2] * 3 + 2]
		);

		if (ray.intersectsSphere(new THREE.Sphere(v0, 1))) {
			const intersects = raycaster.intersectObject(new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([v0, v1, v2])));
			if (intersects.length > 0) {
				altitude = intersects[0].point.y;
				altitudeFound = true;
				break;
			}
		}
	}

	self.postMessage({ altitude, altitudeFound });
};
