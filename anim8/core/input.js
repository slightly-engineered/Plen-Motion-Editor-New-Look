// input.js (ESM version)
// Centralized input manager for the new Motion Editor.
// Handles: joint selection, camera freeze, TransformControls activation,
// keyboard shortcuts, and integration with Timeline.

import { Timeline } from './timeline.js';

console.log("input.js loaded (ESM)");

export const Input = {

    root: null,
    camera: null,
    renderer: null,
    orbit: null,
    transform: null,

    hoveredJoint: null,
    selectedJoint: null,

    raycaster: null,
    mouse: null,

    init({ root, camera, renderer, orbit, transform }) {

        this.root = root;
        this.camera = camera;
        this.renderer = renderer;
        this.orbit = orbit;
        this.transform = transform;

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Modern pointer events
        renderer.domElement.addEventListener("pointermove", e => this.onPointerMove(e));
        renderer.domElement.addEventListener("pointerdown", e => this.onPointerDown(e));
        renderer.domElement.addEventListener("pointerup",   e => this.onPointerUp(e));

        window.addEventListener("keydown", e => this.onKeyDown(e));

        console.log("Input system initialized");
    },

    // ------------------------------------------------------------
    // Pointer → raycast → hover highlight
    // ------------------------------------------------------------
    onPointerMove(event) {

        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        const joints = [];
        this.root.traverse(obj => {
            if (obj.userData.isJoint) joints.push(obj);
        });

        const hits = this.raycaster.intersectObjects(joints, true);

        if (hits.length > 0) {
            const joint = hits[0].object;

            if (this.hoveredJoint !== joint) {
                this.hoveredJoint = joint;
                this.renderer.domElement.style.cursor = "pointer";
            }
        } else {
            this.hoveredJoint = null;
            this.renderer.domElement.style.cursor = "default";
        }
    },

    // ------------------------------------------------------------
    // Pointer down → select joint + attach TransformControls
    // ------------------------------------------------------------
    onPointerDown(event) {
        if (event.button !== 0) return; // left click only

        // If TransformControls is dragging, ignore
        if (this.transform.dragging) return;

        if (this.hoveredJoint) {
            this.selectJoint(this.hoveredJoint);
            this.orbit.enabled = false;
        }
    },

    // ------------------------------------------------------------
    // Pointer up → release TransformControls + re-enable orbit
    // ------------------------------------------------------------
    onPointerUp() {
        this.orbit.enabled = true;
    },

    // ------------------------------------------------------------
    // Select a joint
    // ------------------------------------------------------------
    selectJoint(joint) {
        this.selectedJoint = joint;
        this.transform.attach(joint);

        console.log("Selected joint:", joint.name);
    },

    // ------------------------------------------------------------
    // Keyboard shortcuts
    // ------------------------------------------------------------
    onKeyDown(event) {

        switch (event.key.toLowerCase()) {

            case "f": // frame capture
                if (Timeline.frames.length === 0) {
                    Timeline.addFrame(this.root);
                } else {
                    Timeline.captureFrame(Timeline.currentFrame, this.root);
                }
                console.log("Captured frame", Timeline.currentFrame);
                break;

            case "n": // new frame
                Timeline.addFrame(this.root);
                Timeline.currentFrame = Timeline.frames.length - 1;
                console.log("Added new frame", Timeline.currentFrame);
                break;

            case " ": // spacebar → play/pause
                if (Timeline.playing) Timeline.stop();
                else Timeline.play();
                break;

            case "arrowleft":
                if (Timeline.currentFrame > 0) {
                    Timeline.currentFrame--;
                    Timeline.applyFrame(Timeline.currentFrame, this.root);
                }
                break;

            case "arrowright":
                if (Timeline.currentFrame < Timeline.frames.length - 1) {
                    Timeline.currentFrame++;
                    Timeline.applyFrame(Timeline.currentFrame, this.root);
                }
                break;
        }
    }
};