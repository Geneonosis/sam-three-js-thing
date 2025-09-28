import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';

// create a gameobject class using three.js that creates a provided geometry and material, and has methods to set position, rotation, and scale
class GameObject {
    mesh: THREE.Mesh;
    id: string = uuidv4();
    staticName: string = 'GameObject';
    providedName: string = '';
    constructor(geometry?: THREE.BufferGeometry, material?: THREE.Material, providedName?: string) {
        if (providedName) this.providedName = providedName;
        if (!material) {
            material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        }
        if (!geometry) {
            geometry = new THREE.BoxGeometry(1, 1, 1);
        }
        this.mesh = new THREE.Mesh(geometry, material);
        this.onClick((event => {
            console.log(`Clicked on ${this.providedName || this.staticName} (ID: ${this.id})`);
            console.log(this.getMetaData());
        }));
    };
    setPosition(x: number, y: number, z: number) {
        this.mesh.position.set(x, y, z);
    };
    setRotation(x: number, y: number, z: number) {
        this.mesh.rotation.set(x, y, z);
    };
    setScale(x: number, y: number, z: number) {
        this.mesh.scale.set(x, y, z);
    };
    getMesh() {
        return this.mesh;
    };

    onClick(callback: (event: MouseEvent) => void) {
        // Add event listener to the renderer's DOM element
        window.addEventListener('click', (event) => {
            // Calculate mouse position in normalized device coordinates (-1 to +1) for both components
            const mouse = new THREE.Vector2();
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            // Raycaster to find intersected objects
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, (window as any).camera); // Assuming camera is globally accessible

            const intersects = raycaster.intersectObject(this.mesh);
            if (intersects.length > 0) {
                callback(event);
            }
        });
    }

    /**
     * Returns metadata about the GameObject, including its unique ID, static name, provided name, position, rotation, and scale.
     * @returns An object containing the GameObject's metadata.
     */
    getMetaData() {
        return {
            id: this.id,
            staticName: this.staticName,
            providedName: this.providedName,
            position: this.mesh.position,
            rotation: this.mesh.rotation,
            scale: this.mesh.scale,
        };
    };

    /**
     * Returns a random vertex from the GameObject's geometry in world coordinates.
     * @returns A THREE.Vector3 representing the position of a random vertex in world space.
     */
    getRandomVertex(): { vertex: THREE.Vector3, randomVertexIndex: number } {
        const positionAttribute = this.mesh.geometry.getAttribute('position');
        const randomVertexIndex = Math.floor(Math.random() * (positionAttribute.count));
        const vertex = new THREE.Vector3().fromBufferAttribute(positionAttribute, randomVertexIndex);
        this.mesh.localToWorld(vertex);
        return {vertex, randomVertexIndex};
    }
}

export { GameObject };
