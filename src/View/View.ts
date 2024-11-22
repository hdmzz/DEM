import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/Addons.js';

class	View extends THREE.EventDispatcher {
	scene: THREE.Scene;
	camera: THREE.PerspectiveCamera;
	renderer: THREE.WebGLRenderer;
	controls: OrbitControls;
	container: HTMLDivElement;
	light: THREE.DirectionalLight;
	layers: THREE.Object3D[];

	constructor( container: HTMLDivElement ) {
		super();
		this.scene = new THREE.Scene();
		//this.scene.background = new THREE.Color( "white" );
		this.camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.001, 1000 );
		this.camera.position.z = 1;
		this.camera.position.y = 1.5;
		this.renderer = new THREE.WebGLRenderer({
			antialias: true,
		});
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		this.light = new THREE.DirectionalLight( 0xffffff, 1 );
		this.light.position.set( 0, 10, 20 );
		this.light.castShadow = true;
		this.light.shadow.camera.left = -50;
		this.light.shadow.camera.right = 50;
		this.light.shadow.camera.top = 50;
		this.light.shadow.camera.bottom = -50;
		this.light.shadow.camera.near = 0.5;
		this.light.shadow.camera.far = 500;
		this.light.shadow.bias = -0.0005;
		this.light.shadow.mapSize.width = 2048;
		this.light.shadow.mapSize.height = 2048;
		this.layers = [];
		const	lightHelper = new THREE.DirectionalLightHelper( this.light, 1 );
	
		const	animate =  () => {
			this.controls.update();
			this.renderer.render( this.scene, this.camera );
		};

		this.renderer.setSize( window.innerWidth, window.innerHeight );
		this.renderer.setAnimationLoop( animate );
		const axesHelper = new THREE.AxesHelper( 4 );
		this.scene.add( axesHelper, this.light, lightHelper );

		this.controls = new OrbitControls( this.camera, this.renderer.domElement );
		container.appendChild( this.renderer.domElement );
		this.container = container;

		window.addEventListener('resize', () => {
			this.onResize();
		});
	};

	private	onResize() {
			this.camera.aspect = window.innerWidth / window.innerHeight;
			this.camera.updateProjectionMatrix();
			this.renderer.setSize( window.innerWidth, window.innerHeight );
		};

	public	addLayer(...layers: THREE.Object3D[]) {
		layers.forEach(layer => {
			this.layers.push(layer);
			this.scene.add(layer);
		});
		this.render();
	};

	public	removeLayer() {
		this.layers.forEach(( layer ) => {
			this.scene.remove( layer );

		});
		this.layers = [];
		this.render();
	};

	private	render() {
		this.renderer.render( this.scene, this.camera );
	};
};

export default	View;
