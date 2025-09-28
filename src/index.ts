import * as THREE from 'three';
import { setupUIControls } from "./uiControls";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

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

const directionalLight = new THREE.DirectionalLight(0x0d00ff, 100);
directionalLight.position.set(5, 10, 7.5);
directionalLight.rotation.x = THREE.MathUtils.degToRad(100);
scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight(0xffffff, 100);
ambientLight.position.set(0,0,0);
scene.add(ambientLight);

const geometry = new THREE.BoxGeometry(10,1,1);
const material = new THREE.MeshStandardMaterial({
    color: 0x000000,
    metalness: 0.8,
    roughness: 0.2,
});

const NUMBER_OF_CUBES = 100;
const NUMBER_OF_LIGHTS = NUMBER_OF_CUBES / 10;

const lights: THREE.DirectionalLight[] = [];



const cubes: THREE.Mesh[] = [];
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

for (let i = 0; i < NUMBER_OF_CUBES; i++) {
    const cube = new THREE.Mesh(geometry, material);
    cube.position.y = (i * cubeHeight) - yOffset;
    cube.position.x = 0;
    cube.position.z = -10;
    cube.rotation.y = (i / NUMBER_OF_CUBES) * Math.PI * 8;
    group.add(cube);
    cubes.push(cube);
}

scene.add(group);

group.rotation.z = THREE.MathUtils.degToRad(45);
group.rotation.x = THREE.MathUtils.degToRad(30);

camera.position.z = 10;

function animate() {
    requestAnimationFrame(animate);
    cubes.forEach(cube => {
        cube.rotation.y += 0.0005;
    });
    renderer.render(scene, camera);
}

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
    directionalLight.color.setHex(colors.directionalLight);
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
}

setupUIControls(() => {
    darkMode = !darkMode;
    applyColors();
});

animate();
