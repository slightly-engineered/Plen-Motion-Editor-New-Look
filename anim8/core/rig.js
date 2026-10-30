// rig.js (ESM version)
// Applies joint metadata to the GLB model.
// No re-parenting is needed because the GLB already contains the correct hierarchy.

import { Joints } from './joints.js';

console.log("rig.js loaded (ESM)");

export function setupRig(loadedModel) {

    if (!Joints) {
        console.error("Joints is not defined. Make sure joints.js is imported.");
        return;
    }

    if (!loadedModel || !loadedModel.isObject3D) {
        console.error("No valid model passed to setupRig");
        return;
    }

    console.log("Rig setup: tagging GLB joints...");

    // Apply joint metadata (isJoint, jointType, side)
    Joints.applyTags(loadedModel);

    console.log("Rig setup complete — joint metadata applied.");
}