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

function loadImage(imageSrc: string) {
	const textureLoader = new THREE.TextureLoader();
	textureLoader.load(imageSrc, (texture) => {
		const geometry = new THREE.PlaneGeometry(100, 100);
		const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
		const photoPlane = new THREE.Mesh(geometry, material);
		photoPlane.position.set(0, 0, 0);
		photoPlane.rotateX( -Math.PI / 2)
		view.scene.add(photoPlane);

		//addHandles
		const	handles = new THREE.BoxGeometry( 0.1, 0.1, 0.1 );
		const	handlesMat = new THREE.MeshBasicMaterial({ color: "yellow" });



		const	dragControl = new DragControls([photoPlane], view.camera, view.renderer.domElement);

		dragControl.addEventListener( "dragstart", () => {
			view.controls.enabled = false;
		});

		dragControl.addEventListener( "dragend", () => {
			view.controls.enabled = true;
		});
	});
}
