import * as THREE from "three";
import HugoGeo from "./HugoGeo";
import View from "./View/View";
import Buildings from "./Buildings/Buildings";
import WFSSource from "./Source/WFSSource";
import { DragControls } from 'three/examples/jsm/Addons.js';

const RADIUS = 5.00;
let CENTER: [lat: number, lon: number] = [45.75764503445906, 4.831880908420443];
const gridHelper = new THREE.GridHelper(60, 150, new THREE.Color(0x555555), new THREE.Color(0x333333));
const container = document.getElementById('viewerDiv') as HTMLDivElement;
const view = new View(container);
view.addLayer( gridHelper );
const wfsSource = new WFSSource(CENTER, RADIUS);
const buff = wfsSource.createMultipolygonFromPoint();
const tgeo = new HugoGeo({
	tokenMapBox: 'pk.eyJ1IjoiZWwtb3NvIiwiYSI6ImNsbzRhbXhzcDAwMzMydXBoYmJxbW11ZjMifQ.fw-spr6aqF4LYqfNKiGw_w',
	tokenOpenTopo: '1beba77d1c58069e0c5b7ac410586699',
});

const dropZone = document.getElementById("dropzone");

document.body.addEventListener("dragover", (e) => {
	e.preventDefault();
	dropZone!.style.display = "flex";
});

document.body.addEventListener("dragleave", (e) => {
	e.preventDefault();
	dropZone!.style.display = "none";
});

document.body.addEventListener("drop", (e) => {
	e.preventDefault();
	dropZone!.style.display = "none";

	const file = e.dataTransfer.files[0];

	if (file && file.type.startsWith("image/")) {
		console.log(file);
		const reader = new FileReader();
		reader.readAsDataURL(file);
		reader.onload = (event) => {
			loadImage(event.target?.result as string);
		};
	};
});

let		handles: THREE.Mesh[] = [];
let		photoPlaneMesh: THREE.Mesh;

function	loadImage( imageSrc: string ) {
	const	textureLoader = new THREE.TextureLoader();
	textureLoader.load(imageSrc, (texture) => {
		console.log( imageSrc)
		//!ajuster la widht et la height en fonction de limage
		const	aspectRatio = 16 / 9;
		const	currentWidth = 100, currentHeight = 100;
		const geometry = new THREE.PlaneGeometry( currentWidth, currentHeight );
		const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
		const photoPlane = new THREE.Mesh( geometry, material );
		photoPlane.position.set( 0, 0, 0 );
		//photoPlane.rotateX( -Math.PI / 2)
		view.scene.add( photoPlane );
		photoPlaneMesh = photoPlane;

		//addHandles
		const	handleGeom = new THREE.BoxGeometry( 10, 10, 10 );
		const	handlesMat = new THREE.MeshBasicMaterial({ color: "yellow" });

		const	positions = [
			[-currentWidth / 2, currentHeight / 2],
			[currentWidth / 2, currentHeight / 2],
			[-currentWidth / 2, -currentHeight / 2],
			[currentWidth / 2, -currentHeight / 2],
		];

		positions.forEach(( pos ) => {
			const	handle = new THREE.Mesh( handleGeom, handlesMat );
			handle.position.set( pos[0], pos[1], 0 );
			view.scene.add( handle );
			handles.push( handle );
			activateDragControls();
		});

		const	dragControl = new DragControls([photoPlane], view.camera, view.renderer.domElement);

		dragControl.addEventListener( "dragstart", () => {
			view.controls.enabled = false;
		});

		dragControl.addEventListener( "dragend", () => {
			view.controls.enabled = true;
		});
	});
};

function	activateDragControls() {
	const	dragControls = new DragControls( handles, view.camera, view.renderer.domElement );

	dragControls.addEventListener( "dragstart", () => {
		view.controls.enabled = false;
	});

	dragControls.addEventListener( "dragend", () => {
		view.controls.enabled = true;
	});

	dragControls.addEventListener( "drag", ( event ) => {
		const	handle = event.object;

		const	distanceX = Math.abs( handles[0].position.x - handles[1].position.x );
		updatePlane( distanceX );
	});
};

function	updatePlane( distanceX: number ) {
	photoPlaneMesh.geometry.dispose();
	photoPlaneMesh.geometry = new THREE.PlaneGeometry( distanceX, distanceX );
	handles[0].position.set(-distanceX / 2, distanceX / 2, 0); // Coin sup gauche
	handles[1].position.set(distanceX / 2, distanceX / 2, 0); // Coin sup droit
	handles[2].position.set(-distanceX / 2, -distanceX / 2, 0); // Coin inf gauche
	handles[3].position.set(distanceX / 2, -distanceX / 2, 0); // Coin inf droit
};
