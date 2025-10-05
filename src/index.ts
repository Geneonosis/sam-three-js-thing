import * as THREE from 'three';
import { setupUIControls } from "./uiControls";
import {GameObject} from "./GameObject";
import { TopicRouter } from './TopicRouter';
import { createHUD } from "./hud";
import { loadTopics } from './topicLoader';
import { createWorldPageManager } from './worldPages';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
(window as any).camera = camera;
const renderer = new THREE.WebGLRenderer();

const hud = createHUD();

const pageManager = createWorldPageManager(
    scene,
    camera,
    (anchorId, out) => {
        const anchor = scene.getObjectByName(anchorId);
        if (!anchor) {
            return false;
        }
        anchor.getWorldPosition(out);
        return true;
    },
);

const router = new TopicRouter(camera);
router.setDuration(1100);

const { topics, pages } = loadTopics(hud);

pages.forEach((page) => pageManager.registerPage(page));
pageManager.setActivePage(null);

if (topics.length === 0) {
    console.warn('No topics found in /src/topics');
} else {
    topics.forEach((topic) => {
        const originalOnEnter = topic.onEnter;
        topic.onEnter = () => {
            pageManager.setActivePage(topic.id);
            originalOnEnter?.();
        };
        router.add(topic);
    });
    router.goTo(0);
}

// Keyboard: ArrowLeft/ArrowRight, 1-5 to jump
window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') router.next();
    if (e.key === 'ArrowLeft') router.prev();
    const n = Number(e.key);
    if (!Number.isNaN(n) && n >= 1 && n <= topics.length) router.goTo(n - 1);
});

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
 * Animation loop to rotate cubes and keep navigation/page state in sync.
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

    router.update(deltaMs);
    pageManager.update();
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

setupUIControls(
    handleDarkModeToggle,
    handleSpeedChange,
    handleWorldGradient,
    handleDirectionalLightControls,
    handleCubeControls,
    {
        navControls: [
            { icon: 'chevron_left', aria: 'Previous topic', handler: () => router.prev() },
            { icon: 'chevron_right', aria: 'Next topic', handler: () => router.next() },
        ],
    },
);

applyColors();
const gameLoop = GameLoop.getInstance();
gameLoop.start();
