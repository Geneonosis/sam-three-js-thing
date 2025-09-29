import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';

/**
 * GameObject class represents a 3D object in a Three.js scene with unique ID, name, and interaction capabilities.
 * It supports click and hover events, and provides metadata about its properties.
 * @example
 * ```typescript
 * const gameObject = new GameObject();
 * gameObject.setPosition(1, 2, 3);
 * scene.add(gameObject.getMesh());
 * ```
 * @class GameObject
 * @property {THREE.Mesh} mesh - The Three.js mesh representing the object.
 * @property {string} id - Unique identifier for the GameObject.
 * @property {string} staticName - Static name of the class, defaults to 'GameObject'.
 * @property {string} providedName - Optional name provided during instantiation.
 * @property {boolean} verbose - If true, enables verbose logging. Defaults to false.
 *
 * @see {@link https://threejs.org/docs/index.html#api/en/core/Object3D|Three.js Object3D}
 */
class GameObject extends THREE.Mesh{
    _id: string = uuidv4();
    staticName: string = 'GameObject';
    providedName: string = '';
    verbose: boolean = false;
    constructor(geometry?: THREE.BufferGeometry, material?: THREE.Material, providedName?: string, verbose?: boolean) {
        if (!material) {
            material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        }
        if (!geometry) {
            geometry = new THREE.BoxGeometry(1, 1, 1);
        }
        super(geometry, material);
        if (verbose) this.verbose = verbose;
        if (providedName) this.providedName = providedName;
        this.onClick((event => {
            console.log(`Clicked on ${this.providedName || this.staticName} (ID: ${this._id})`);
            console.log(this.getMetaData());
        }));
        this.onHover(( (event, isHovering) => {
            if (isHovering) {
               // create a new div that will follow the mouse cursor and display the name of the object
               let infoDiv = document.getElementById('info-div');
               if (!infoDiv) {
                   infoDiv = document.createElement('div');
                   infoDiv.id = 'info-div';
                   infoDiv.style.position = 'absolute';
                   infoDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
                   infoDiv.style.color = 'white';
                   infoDiv.style.padding = '5px';
                   infoDiv.style.borderRadius = '5px';
                   infoDiv.style.pointerEvents = 'none';
                   infoDiv.style.fontFamily = 'Arial, sans-serif';
                   document.body.appendChild(infoDiv);
               }
               infoDiv.innerHTML = `${this.providedName || this.staticName} (ID: ${this._id}) <br> this.getMetaData(): <br> ${this.prettyPrintAsHTML()}`;
               infoDiv.style.left = `${event.clientX + 10}px`;
               infoDiv.style.top = `${event.clientY + 10}px`;
               infoDiv.style.display = 'block';
            }
        }),verbose);

        this.onHoverEnd(() => {
            let infoDiv = document.getElementById('info-div');
            if (infoDiv) {
                infoDiv.style.display = 'none';
            }
        }, verbose);

        if (this.verbose) console.log(`Created ${this.providedName || this.staticName} with ID: ${this._id}`);
    };
    setPosition(x: number, y: number, z: number) {
        this.position.set(x, y, z);
    };
    setRotation(x: number, y: number, z: number) {
        this.rotation.set(x, y, z);
    };
    setScale(x: number, y: number, z: number) {
        this.scale.set(x, y, z);
    };
    getMesh() {
        return this;
    };

    onClick(callback: (event: MouseEvent) => void) {
        // Add event listener to the renderer's DOM element
        window.addEventListener('click', (event) => {
            const intersects = this._getIntersectsWithMouseRaycast(event);
            if (intersects.length > 0) {
                callback(event);
            }
        });
    }

    /**
     * Registers a callback function to be invoked when the mouse hovers over or leaves the GameObject.
     * The callback receives the mouse event and a boolean indicating whether the mouse is currently hovering over the object.
     * @param callback {(event: MouseEvent, isHovering: boolean) => void} - The function to call on hover events.
     * @param verbose {boolean} - If true, logs additional information to the console.
     */
    onHover(callback: (event: MouseEvent, isHovering: boolean) => void, verbose?: boolean) {
        if (verbose) console.log('Registering onHover callback');
        let isHovering = false;
        window.addEventListener('mousemove', (event) => {
            const intersects = this._getIntersectsWithMouseRaycast(event);
            if (intersects.length > 0) {
                if (!isHovering) {
                    isHovering = true;
                    callback(event, isHovering);
                }
            } else {
                if (isHovering) {
                    isHovering = false;
                    callback(event, isHovering);
                }
            }
        });
    }

    /**
     * Registers a callback function to be invoked when the mouse starts hovering over the GameObject.
     * @param callback {() => void} - The function to call when hovering starts.
     * @param verbose {boolean} - If true, logs additional information to the console.
     */
    onHoverStart(callback: () => void, verbose?: boolean) {
        if (verbose) console.log('Registering onHoverStart callback');
        let isHovering = false;
        window.addEventListener('mousemove', (event) => {
            const intersects = this._getIntersectsWithMouseRaycast(event);
            if (intersects.length > 0) {
                if (!isHovering) {
                    isHovering = true;
                    callback();
                }
            } else {
                isHovering = false;
            }
        });
    }

    /**
     * Registers a callback function to be invoked when the mouse stops hovering over the GameObject.
     * @param callback
     */
    onHoverEnd(callback: () => void, verbose?: boolean) {
        if (verbose) console.log('Registering onHoverEnd callback');
        let isHovering = false;
        window.addEventListener('mousemove', (event) => {
            const intersects = this._getIntersectsWithMouseRaycast(event);
            if (intersects.length > 0) {
                isHovering = true;
            } else {
                if (isHovering) {
                    isHovering = false;
                    callback();
                }
            }
        });
    }

    private _getIntersectsWithMouseRaycast(event: MouseEvent) {
        // Calculate mouse position in normalized device coordinates (-1 to +1) for both components
        const mouse = new THREE.Vector2();
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // Raycaster to find intersected objects
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, (window as any).camera); // Assuming camera is globally accessible

        return raycaster.intersectObject(this);
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
            position: this.position,
            rotation: this.rotation,
            scale: this.scale,
        };
    };

    prettyPrintMetaData() {
       return JSON.stringify(this.getMetaData(), null, 2);
    }

    prettyPrintAsHTML() {
         const metaData = this.getMetaData();
            return `
                <strong>ID:</strong> ${metaData.id} <br>
                <strong>Static Name:</strong> ${metaData.staticName} <br>
                <strong>Provided Name:</strong> ${metaData.providedName} <br>
                <strong>Position:</strong> x: ${metaData.position.x.toFixed(2)}, y: ${metaData.position.y.toFixed(2)}, z: ${metaData.position.z.toFixed(2)} <br>
                <strong>Rotation:</strong> x: ${metaData.rotation.x.toFixed(2)}, y: ${metaData.rotation.y.toFixed(2)}, z: ${metaData.rotation.z.toFixed(2)} <br>
                <strong>Scale:</strong> x: ${metaData.scale.x.toFixed(2)}, y: ${metaData.scale.y.toFixed(2)}, z: ${metaData.scale.z.toFixed(2)} <br>
            `;
    }

    /**
     * Returns a random vertex from the GameObject's geometry in world coordinates.
     * @returns A THREE.Vector3 representing the position of a random vertex in world space.
     */
    getRandomVertex(): { vertex: THREE.Vector3, randomVertexIndex: number } {
        const positionAttribute = this.geometry.getAttribute('position');
        const randomVertexIndex = Math.floor(Math.random() * (positionAttribute.count));
        const vertex = new THREE.Vector3().fromBufferAttribute(positionAttribute, randomVertexIndex);
        this.localToWorld(vertex);
        return {vertex, randomVertexIndex};
    }
}

export { GameObject };
