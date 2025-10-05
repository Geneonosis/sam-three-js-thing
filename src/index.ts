import * as THREE from 'three';
import { setupUIControls } from "./uiControls";
import {LineBasicMaterial} from "three";
import {GameObject} from "./GameObject";
import { TopicRouter, Topic } from './TopicRouter';
import { createHUD } from "./hud";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
(window as any).camera = camera;
const renderer = new THREE.WebGLRenderer();

const hud = createHUD();

const router = new TopicRouter(camera);
router.setDuration(1100);

// Topic helpers
const V = (x:number,y:number,z:number) => new THREE.Vector3(x,y,z);

// Build “stations” for your five questions
const topics: Topic[] = [
    {
        id: 'what',
        title: '1) What is Three.js?',
        position: V(-12, 4, 14),
        lookAt: V(0, 0, -10),
        onEnter: () => hud.set(`
      <h3>What is Three.js?</h3>
      Three.js is a JS library that wraps WebGL so you can compose scenes with objects, lights, materials, and cameras.
      It handles shaders, buffers, and matrices so you can focus on making things, not boilerplate.
    `),
    },
    {
        id: 'why',
        title: '2) Why 3D in the browser?',
        position: V(0, 8, 16),
        lookAt: V(0, 0, -10),
        onEnter: () => hud.set(`
      <h3>Why render 3D in-browser?</h3>
      Zero install, instant share links, data-driven interactivity, and a direct line to the web’s ecosystem.
      Use cases: product viewers, data viz, education, art, games, XR.
    `),
    },
    {
        id: 'history',
        title: '3) History of 3D on the web',
        position: V(12, 4, 14),
        lookAt: V(0, 0, -10),
        onEnter: () => hud.set(`
      <h3>History</h3>
      VRML/Java applets → Flash/Stage3D → WebGL (2011) → Three.js abstraction → WebGPU era.
      Tooling and performance matured; now it’s mainstream.
    `),
    },
    {
        id: 'hurdles',
        title: '4) Technical hurdles',
        position: V(12, -2, 3),
        lookAt: V(0, 0, -10),
        onEnter: () => hud.set(`
      <h3>Hurdles</h3>
      Secure GPU access, perf in JS, cross-browser quirks, shader debugging, and dev ergonomics.
      Today: TS, Vite, devtools, and libs like Three reduce the pain.
    `),
    },
    {
        id: 'showcase',
        title: '5) Showcase',
        position: V(0, -6, 2),
        lookAt: V(0, -5, -2), // your group
        onEnter: () => hud.set(`
      <h3>Showcase: Your Demo</h3>
      Live-tweak lights, materials, and rotation. Highlight an object, surface its metadata, and talk through the scene graph.
    `),
    },
];

topics.forEach(t => router.add(t));
router.goTo(0);

// Keyboard: ArrowLeft/ArrowRight, 1-5 to jump
window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') router.next();
    if (e.key === 'ArrowLeft') router.prev();
    const n = Number(e.key);
    if (!Number.isNaN(n) && n >= 1 && n <= topics.length) router.goTo(n - 1);
});

// Quick on-screen buttons
const nav = document.createElement('div');
nav.style.position = 'absolute';
nav.style.right = '20px';
nav.style.bottom = '20px';
nav.style.display = 'flex';
nav.style.gap = '8px';
['Prev','Next'].forEach(label => {
    const b = document.createElement('button');
    b.textContent = label;
    b.onclick = () => (label === 'Next' ? router.next() : router.prev());
    nav.appendChild(b);
});
document.body.appendChild(nav);


renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create gradient canvas
const canvas = document.createElement('canvas');
canvas.width = 512;
canvas.height = 512;
const ctx = canvas.getContext('2d')!;
const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
gradient.addColorStop(0, '#010003'); // Blue
gradient.addColorStop(1, '#000000'); // Black
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, canvas.width, canvas.height);

const ambientLight = new THREE.AmbientLight(0xffffff, 100);
ambientLight.position.set(0,0,0);
scene.add(ambientLight);

const geometry = new THREE.BoxGeometry(10,1,1);
const material = new THREE.MeshStandardMaterial({
    color: 0x000000,
    metalness: 0.8,
    roughness: 0.2,
});

const NUMBER_OF_CUBES = 30;
const NUMBER_OF_LIGHTS = Math.ceil(NUMBER_OF_CUBES / 10);

const lights: THREE.DirectionalLight[] = [];

// const cubes: THREE.Mesh[] = [];
const gameObjects: GameObject[] = [];
const cubeHeight = 1;
const yOffset = (NUMBER_OF_CUBES * cubeHeight) / 2;


for (let i = 0; i < NUMBER_OF_LIGHTS; i++) {
    const angle = (i / NUMBER_OF_LIGHTS) * Math.PI * 8;
    const y = (i * 10) - yOffset;
    const x = Math.cos(angle) * 5;
    const z = Math.sin(angle) * 5 - 10;

    const light = new THREE.DirectionalLight(0x0d00ff, 2);
    light.position.set(x, y, z);
    scene.add(light);
    lights.push(light);
}

const bgTexture = new THREE.CanvasTexture(canvas);
scene.background = bgTexture;

const group = new THREE.Group();

scene.fog = new THREE.Fog(0x000000, 20, 80); // Black fog, starts at 20 units, fully opaque at 80

const gap = 0.5;
for (let i = 0; i < NUMBER_OF_CUBES; i++) {
    const gameObject = new GameObject(geometry, material, `Cube_${i}`, false);
    gameObject.setPosition(0, (i * (cubeHeight + gap)) - yOffset, -10);
    gameObject.setRotation(0, (i / NUMBER_OF_CUBES) * Math.PI * 2, 0);
    group.add(gameObject.getMesh());
    gameObjects.push(gameObject);
}

scene.add(group);
group.position.set(0,-5,-2);
group.rotation.z = THREE.MathUtils.degToRad(45);
group.rotation.x = THREE.MathUtils.degToRad(30);

camera.position.z = 10;

let rotationSpeed = 0.0005;

/**
 * Animation loop to rotate cubes and update line to vertex
 * @function animate
 * @returns {void}
 */
let last = performance.now();
function animate(): void {
    requestAnimationFrame(animate);
    const now = performance.now();
    const deltaMs = now - last; last = now;

    gameObjects.forEach(obj => {
        obj.getMesh().rotation.y += rotationSpeed;
    })

    // group.rotation.y += rotationSpeed;
    updateLineToVertex(line, randomCubeIndex, randomVertexIndex);

    router.update(deltaMs);
    renderer.render(scene, camera);
}

/**
 * Singleton class to manage the game loop
 * @class GameLoop
 * @example
 * const gameLoop = GameLoop.getInstance();
 * gameLoop.start();
 */
class GameLoop {
    private static instance: GameLoop;
    private constructor() {
        // Private constructor to prevent direct instantiation
    }
    public static getInstance(): GameLoop {
        if (!GameLoop.instance) {
            GameLoop.instance = new GameLoop();
        }
        return GameLoop.instance;
    }
    public start(): void {
        animate();
    }
}

//create a line where one end of it is at the bottom left of the scene and the other end is the position of the random vertex relative to the chosen cube
function createLineToVertex(vertex: THREE.Vector3) {
    const material = new THREE.LineBasicMaterial({ color: 0xffffff });
    const points = [];
    points.push(new THREE.Vector3(-5, - (NUMBER_OF_CUBES / 2) * cubeHeight, -10));
    points.push(vertex);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    scene.add(line);
    return line;
}

const randomCubeIndex = Math.floor(Math.random() * gameObjects.length);
const {vertex, randomVertexIndex} = gameObjects[randomCubeIndex | 0].getRandomVertex();
const line = createLineToVertex(vertex);

//create a function that will update the end vertex of the line in the animation loop, using the same cube index in the cube array
const updateLineToVertex = (line: THREE.Line, cubeIndex: number, randomVertexIndex: number) => {
    const gameObject = gameObjects[cubeIndex];
    const positionAttribute = gameObject.getMesh().geometry.getAttribute('position');
    const vertex = new THREE.Vector3().fromBufferAttribute(positionAttribute, randomVertexIndex);
    gameObject.getMesh().localToWorld(vertex);
    const points = [];
    points.push(new THREE.Vector3(-1,-10, -9));
    points.push(new THREE.Vector3(vertex.x, vertex.y, vertex.z));
    line.renderOrder = 2; // ensure the line is rendered on top
    (line.material as LineBasicMaterial).depthTest = false; // disable depth testing for the line material
    line.geometry.setFromPoints(points);
}

// Define color schemes for dark and light modes

const darkColors = {
    gradientStart: '#010003',
    gradientEnd: '#000000',
    directionalLight: 0x0d00ff,
    ambientLight: 0xffffff,
    fog: 0x000000,
    material: 0x000000
};

const lightColors = {
    gradientStart: '#e0e7ff', // light blue
    gradientEnd: '#ffffff',   // white
    directionalLight: 0x87cefa, // sky blue
    ambientLight: 0xffffff,
    fog: 0xffffff,
    material: 0xffffff
};

let darkMode = true;

function applyColors() {
    const colors = darkMode ? darkColors : lightColors;

    // Update gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, colors.gradientStart);
    gradient.addColorStop(1, colors.gradientEnd);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    bgTexture.needsUpdate = true;

    // Update lights
    ambientLight.color.setHex(colors.ambientLight);

    lights.forEach(light => light.color.setHex(colors.directionalLight));

    // Update fog
    scene.fog?.color.setHex(colors.fog);

    // Update material
    material.color.setHex(colors.material);

    // Update all button text colors for dark background
    const buttons= document.getElementsByTagName('button');
    for (let i = 0; i < buttons.length; i++) {
        buttons[i].style.color = darkMode ? 'white' : 'black';
    }

    const labels = document.getElementsByTagName('label');
    for (let i = 0; i < labels.length; i++) {
        labels[i].style.color = darkMode ? 'white' : 'black';
    }
}

const handleDarkModeToggle = () => {
    darkMode = !darkMode;
    applyColors();
}

const handleSpeedChange = (value: number) => {
    rotationSpeed = value / 100000;
}

const handleWorldGradient = (startColor: string, endColor: string) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, startColor);
    gradient.addColorStop(1, endColor);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    bgTexture.needsUpdate = true;
}

const handleDirectionalLightControls = (color: string, intensity: number) => {
    lights.forEach(light => {
        light.color = new THREE.Color(color);
        light.intensity = intensity;
    });
}

const handleCubeControls = (materialColor: string, metalness: number, roughness: number) => {
    console.log(roughness);
    console.log(materialColor);
    console.log(metalness);
    material.color = new THREE.Color(materialColor);
    material.metalness = metalness;
    console.log(material);
    material.roughness = roughness;
}

setupUIControls(handleDarkModeToggle, handleSpeedChange, handleWorldGradient, handleDirectionalLightControls, handleCubeControls);

applyColors();
const gameLoop = GameLoop.getInstance();
gameLoop.start();
