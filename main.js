import './style.css';
import * as THREE from 'three';
import { getRandomInt } from './utils/math';
import CANNON from 'cannon';
import p5 from 'p5';
const { createVector, noise } = p5.prototype;
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const app = document.querySelector('#app');

let body, shape, mass;

/*
 * Scene
 */
const color = 'rgb(106,193,222)'; // white
const near = 1000;
const far = 10000;
const scene = new THREE.Scene();
scene.background = new THREE.Color(color);
scene.fog = new THREE.Fog(color, near, far);

const gltfLoader = new GLTFLoader();
let model = null;
let tree = new THREE.Object3D();
const trees = [];

gltfLoader.load(
  '/models/test.gltf',
  (gltf) => {
    model = { ...gltf };
    let mesh = model.scene.children[2];
    tree.add(mesh);
    setup();
  },
  (xhr) => {
    const percentLoaded = (xhr.loaded / xhr.total) * 100;
    console.log(percentLoaded + '% loaded');
  },
  (error) => {
    console.log('An error happened');
  }
);

function addTree(x, y, z) {
  let newTree = new THREE.Object3D();
  newTree.add(tree.clone());
  newTree.scale.set(10, 10, 10);
  newTree.position.set(x, y, z);
  trees.push(newTree);
  scene.add(newTree);
}

/*
 * Sphere
 */
const sphereGeom = new THREE.SphereGeometry(1, 32, 16);
const sphereMat = new THREE.MeshBasicMaterial({ color: 'rgb(0,0,96)' });
const sphere = new THREE.Mesh(sphereGeom, sphereMat);
// sphere.position.y = 10;
scene.add(sphere);

/*
 * Camera
 */
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  10000
);

// Controls
const controls = new OrbitControls(camera, app);
controls.target.set(0, 0, 0);
controls.enableDamping = true;

/*
 *  Lights
 */
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(-10, 10, 0);
const renderer = new THREE.WebGLRenderer({ antialias: true });

const floorGeom = new THREE.PlaneGeometry(1240, 1240, 96, 96);
// floorGeom.dynamic = true;

const floorMaterial = new THREE.MeshStandardMaterial({
  // vertexColors: true,
  color: new THREE.Color('green'),
  // wireframe: true,
});

const floor = new THREE.Mesh(floorGeom, floorMaterial);

/*
 * Physics
 */
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);
world.broadphase = new CANNON.NaiveBroadphase();
world.solver.iterations = 7;
world.solver.tolerance = 0.1;

world.quatNormalizeSkip = 0;
world.quatNormalizeFast = false;
world.defaultContactMaterial.contactEquationStiffness = 1e9;
world.defaultContactMaterial.contactEquationRelaxation = 4;

// cannon sphere shape
shape = new CANNON.Sphere(1);
mass = 1;
body = new CANNON.Body({
  mass: 1,
});
body.position.set(1, 4, 1);
body.addShape(shape);
// body.angularVelocity.set(0, 10, 0);
body.angularDamping = 0.5;
world.addBody(body);

// ground plane
let groundMaterial = new CANNON.Material();
let groundShape = new CANNON.Plane();
let groundBody = new CANNON.Body({ mass: 0, material: groundMaterial });
groundBody.addShape(groundShape);
world.add(groundBody);

let mat1_ground = new CANNON.ContactMaterial(groundMaterial, floorMaterial, {
  friction: 0.0,
  restitution: 0.0,
});

world.addContactMaterial(mat1_ground);

/*
 * Setup
 */
function setup() {
  // camera
  camera.position.z = 12;
  camera.position.y = 3;
  camera.rotation.x = -0.3;
  // camera.lookAt(0, 0, 0);

  controls.update();
  scene.add(light);

  floor.position.y = 0;
  floor.material.side = THREE.DoubleSide;
  floor.rotation.x = Math.PI / 2;
  scene.add(floor);

  // renderer
  // renderer.shadowMap.enabled = true;
  // renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
  renderer.setSize(window.innerWidth, window.innerHeight);
  app.appendChild(renderer.domElement);

  // renderer.render(scene, camera);

  draw();
}

function updatePhysics() {
  // Update the physics world
  world.step(1 / 60, null, 3);
  // Copy coordinates from Cannon.js to Three.js
  sphere.position.copy(body.position);
  sphere.quaternion.copy(body.quaternion);
}

/*
 * "Game" Loop
 */

const clock = new THREE.Clock();
let oldElapsedTime = 0;

function draw() {
  // console.log(body.position);
  const elapsedTime = clock.getElapsedTime();
  const deltaTime = elapsedTime - oldElapsedTime;
  oldElapsedTime = elapsedTime;
  updatePhysics();
  renderer.render(scene, camera);
  requestAnimationFrame(draw);
}
