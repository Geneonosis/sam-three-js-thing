import * as THREE from 'three';

/**
 * A topic represents a point of interest in the 3D scene.
 * The camera can move to the topic's position and optionally look at a target.
 * The onEnter callback can be used to trigger actions when the topic is reached.
 * @interface Topic
 * @property {string} id - Unique identifier for the topic.
 * @property {string} title - Title of the topic.
 * @property {THREE.Vector3} position - Position of the topic in 3D space.
 * @property {THREE.Vector3} [lookAt] - Optional point for the camera to look at when at this topic.
 * @property {() => void} [onEnter] - Optional callback triggered when the topic is reached.
 */
export type Topic = {
    id: string;
    title: string;
    position: THREE.Vector3;
    lookAt?: THREE.Vector3;
    onEnter?: () => void; // show HUD Text, trigger highlights, etc.
}

/**
 * Class to manage camera movement between predefined topics in a 3D scene.
 * Each topic has a position and an optional lookAt target.
 * The camera smoothly transitions between topics over a set duration.
 *
 * @example
 * ```typescript
 * const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
 * const topicRouter = new TopicRouter(camera);
 * topicRouter.add({ id: 'intro', title: 'Introduction', position: new THREE.Vector3(0, 5, 10), lookAt: new THREE.Vector3(0, 0, 0) });
 * topicRouter.add({ id: 'feature', title: 'Feature', position: new THREE.Vector3(10, 5, 10), lookAt: new THREE.Vector3(0, 0, 0) });
 * topicRouter.goTo(0); // Move to the first topic
 *
 * function animate(time: number) {
 *   requestAnimationFrame(animate);
 *   const deltaMs = time - (prevTime || time);
 *   prevTime = time;
 *   topicRouter.update(deltaMs);
 *   renderer.render(scene, camera);
 *   }
 *   animate(0);
 *   ```
 *  @see https://threejs.org/docs/index.html#api/en/cameras/Camera
 *  @class TopicRouter
 */
export class TopicRouter {
    private topics: Topic[] = [];
    private index = 0;
    private camera: THREE.Camera;
    private lerpT = 0;
    private fromPos = new THREE.Vector3();
    private toPos = new THREE.Vector3();
    private fromLook = new THREE.Vector3();
    private toLook = new THREE.Vector3();
    private isMoving = false;
    private durationMs = 1200;

    /**
     * Create a TopicRouter to manage camera movement between topics.
     * @param camera {THREE.Camera} the camera to control
     * @param durationMs {number} optional duration in milliseconds for camera transitions (default 1200ms)
     */
    constructor(camera: THREE.Camera, durationMs?: number) {
        if (durationMs) this.durationMs = durationMs;
        this.camera = camera;
    }

    /**
     * add a new topic to the router
     * @param topic
     */
    add(topic: Topic) { this.topics.push(topic); }

    /**
     * set a duration for the camera to move between topics
     * @param ms
     */
    setDuration(ms: number) { this.durationMs = ms; }

    /**
     * get the current topic
     */
    get current() { return this.topics[this.index]; }

    /**
     * Move the camera to the topic at index i
     * @param i {number} index of the topic to move to
     */
    goTo(i: number) {
        if (i < 0 || i >= this.topics.length) return;
        this.index = i;
        const t = this.topics[i];

        this.fromPos.copy(this.camera.position);
        this.toPos.copy(t.position);

        const currentLook = new THREE.Vector3(0,0,-1).applyQuaternion(this.camera.quaternion).add(this.camera.position);
        this.fromLook.copy(currentLook);
        this.toLook.copy(t.lookAt ?? new THREE.Vector3(0,0,-1));

        this.lerpT = 0;
        this.isMoving = true;

        t.onEnter?.();
    }

    /**
     * Move to the next topic in the list, or stay at the last one if already there.
     */
    next() { this.goTo(Math.min(this.index + 1, this.topics.length - 1)); }

    /**
     * Move to the previous topic in the list, or stay at the first one if already there.
     */
    prev() { this.goTo(Math.max(this.index - 1, 0)); }

    /** Call each frame with deltaMs from your loop **/
    update(deltaMs: number) {
        if (!this.isMoving) return;
        this.lerpT += deltaMs / this.durationMs;
        const t = Math.min(1,this.lerpT);
        const ease = t*t*(3-2*t); // smoothstep

        this.camera.position.lerpVectors(this.fromPos, this.toPos, ease);
        const target = new THREE.Vector3().lerpVectors(this.fromLook, this.toLook, ease);
        this.camera.lookAt(target);

        if (t >= 1) this.isMoving = false;
    }
}

