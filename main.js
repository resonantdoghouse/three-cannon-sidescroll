import './style.css';
import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const app = document.querySelector('#app');

const gltfLoader = new GLTFLoader();
let model = null;

gltfLoader.load('/models/palmtree.gltf', (gltf) => {
  model = { ...gltf };
  let mesh = model.scene.children[0];

  gltf.scene.traverse(function (node) {
    if (node.isMesh) {
      node.castShadow = true;
    }
  });
  // tree.add(mesh);
  scene.add(mesh);
  mesh.castShadow = true;
});

/*
 * Scene
 */
const color = 'rgb(106,193,222)';
const near = 100;
const far = 1000;
const scene = new THREE.Scene();
scene.background = new THREE.Color(color);
scene.fog = new THREE.Fog(color, near, far);

/*
 * Meshes & materials
 */
const sphereGeom = new THREE.SphereGeometry(1, 32, 16);
const sphereMat = new THREE.MeshStandardMaterial({
  metalness: 0,
  color: 'rgb(255,139,18)',
});
const sphere = new THREE.Mesh(sphereGeom, sphereMat);
sphere.receiveShadow = false;
sphere.castShadow = true;
scene.add(sphere);

const sunGeom = new THREE.SphereGeometry(2, 32, 16);
const sunMat = new THREE.MeshBasicMaterial({
  color: 'rgb(255,250,57)',
});

const sunGroup = new THREE.Group();
sunGroup.position.set(0, 0, 0);

const sun = new THREE.Mesh(sunGeom, sunMat);
sun.position.set(0, 12, 0);
sunGroup.add(sun);
scene.add(sunGroup);

const floorGeom = new THREE.PlaneGeometry(2000, 100, 96, 96);

const floorMaterial = new THREE.MeshStandardMaterial({
  metalness: 1,
  color: new THREE.Color('green'),
});

const floor = new THREE.Mesh(floorGeom, floorMaterial);

/*
 * Camera
 */
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  10000
);

const controls = new OrbitControls(camera, app);
controls.enableDamping = true;

const renderer = new THREE.WebGLRenderer({ antialias: true });

/*
 *  Lights
 */
const light = new THREE.DirectionalLight(0xffffff, 1);
light.castShadow = true;
light.position.set(0, 10, 6);

const sunLightGroup = new THREE.Group();
sunLightGroup.position.set(0, 0, 0);
const sunLight = new THREE.PointLight(0xffffff, 1, 100);
sunLight.position.set(0, 6, 0);
sunLight.castShadow = true;
sunLightGroup.add(sunLight);
scene.add(sunLightGroup);
// const helper = new THREE.DirectionalLightHelper(light, 5);
// scene.add(helper);

const loader = new FontLoader();

loader.load('fonts/helvetiker_regular.typeface.json', function (font) {
  const textGeom = new TextGeometry('Three JS', {
    font: font,
    size: 4,
    height: 2,
  });

  const text = new THREE.Mesh(textGeom, floorMaterial);
  // text.rotation.x = Math.PI / 2;
  text.position.z = -12;
  text.position.x = -10;
  text.castShadow = true;
  scene.add(text);
});

/*
 * Physics
 */
let mass;
const worldPoint = new CANNON.Vec3(0, 0, 0);
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);
world.broadphase = new CANNON.NaiveBroadphase();
world.solver.iterations = 7;
world.solver.tolerance = 0.1;

world.quatNormalizeSkip = 0;
world.quatNormalizeFast = false;
world.defaultContactMaterial.contactEquationStiffness = 1e9;
world.defaultContactMaterial.contactEquationRelaxation = 4;

// ground plane & contact materials
const concreteMaterial = new CANNON.Material('concrete');
const plasticMaterial = new CANNON.Material('plastic');
const concretePlasticContactMaterial = new CANNON.ContactMaterial(
  concreteMaterial,
  plasticMaterial,
  {
    friction: 0.1,
    restitution: 0.6,
  }
);
let groundShape = new CANNON.Plane();
let groundBody = new CANNON.Body({
  mass: 0,
  material: concreteMaterial,
});
groundBody.quaternion.setFromAxisAngle(
  new CANNON.Vec3(-1, 0, 0),
  Math.PI * 0.5
);

groundBody.addShape(groundShape);
world.addBody(groundBody);

// cannon sphere spherePhysicsShape
const spherePhysicsShape = new CANNON.Sphere(1);
mass = 1;

const sphereBody = new CANNON.Body({
  mass: 1,
  material: plasticMaterial,
});
sphereBody.position.set(0, 8, 0);
sphereBody.addShape(spherePhysicsShape);
world.addBody(sphereBody);

world.addContactMaterial(concretePlasticContactMaterial);

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowRight') {
    // accX += 0.1;
    sphereBody.velocity.x += 10;
  }
  if (e.key === 'ArrowLeft') {
    // accX -= 0.1;
    sphereBody.velocity.x -= 10;
  }
  if (e.key === 'ArrowUp') {
    sphereBody.velocity.y += 10;
  }
});

/*
 * Setup
 */
function setup() {
  // camera
  camera.position.z = 22;
  camera.position.y = 3;
  camera.rotation.x = -0.3;

  controls.update();
  scene.add(light);

  floor.position.y = 0;
  floor.material.side = THREE.DoubleSide;
  floor.rotation.x = Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // renderer
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
  renderer.setSize(window.innerWidth, window.innerHeight);
  app.appendChild(renderer.domElement);
  // renderer.render(scene, camera);

  draw();
}

let lastCallTime;
function updatePhysics() {
  // Update the physics world
  world.step(1 / 60);
  // Copy coordinates from Cannon.js to Three.js
  sphere.position.copy(sphereBody.position);
  sphere.quaternion.copy(sphereBody.quaternion);
}

/*
 * "Game" Loop
 */

const clock = new THREE.Clock();
let oldElapsedTime = 0;

function draw() {
  const elapsedTime = clock.getElapsedTime();
  const deltaTime = elapsedTime - oldElapsedTime;
  oldElapsedTime = elapsedTime;
  updatePhysics();
  camera.position.x = sphere.position.x;
  camera.position.y = sphere.position.y;

  // controls.update();
  renderer.render(scene, camera);
  sunGroup.rotation.z = -elapsedTime * 0.1;
  sunLightGroup.rotation.z = -elapsedTime * 0.1;
  requestAnimationFrame(draw);
}

setup();
