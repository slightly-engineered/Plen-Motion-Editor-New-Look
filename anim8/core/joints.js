// joints.js (ESM version)
// Joint registry for the new single‑GLB robot.
// Includes ALL bones from the GLB (servo + non‑servo).
// Used for picking, tagging, UI metadata, etc.

console.log("Joints registry initialized (ESM)");

export const Joints = {};

// List of joint names exactly as they appear in the GLB
Joints.names = [
    "torso",
    "neck_yaw",
    "head",

    "left_shoulder_pitch",
    "left_shoulder_roll",
    "left_elbow_roll",

    "left_thigh_yaw",
    "left_thigh_roll",
    "left_thigh_pitch",
    "left_knee_pitch",
    "left_foot_pitch",
    "left_foot_roll",

    "right_shoulder_pitch",
    "right_shoulder_roll",
    "right_elbow_roll",

    "right_thigh_yaw",
    "right_thigh_roll",
    "right_thigh_pitch",
    "right_knee_pitch",
    "right_foot_pitch",
    "right_foot_roll"
];

// Joint metadata (optional but useful for UI, diff-angle, etc.)
Joints.meta = {
    torso:               { type: "torso" },
    neck_yaw:            { type: "neck" },
    head:                { type: "head" },

    left_shoulder_pitch: { type: "shoulder", side: "left" },
    left_shoulder_roll:  { type: "shoulder", side: "left" },
    left_elbow_roll:     { type: "elbow",    side: "left" },

    left_thigh_yaw:      { type: "thigh",    side: "left" },
    left_thigh_roll:     { type: "thigh",    side: "left" },
    left_thigh_pitch:    { type: "thigh",    side: "left" },
    left_knee_pitch:     { type: "knee",     side: "left" },
    left_foot_pitch:     { type: "foot",     side: "left" },
    left_foot_roll:      { type: "foot",     side: "left" },

    right_shoulder_pitch:{ type: "shoulder", side: "right" },
    right_shoulder_roll: { type: "shoulder", side: "right" },
    right_elbow_roll:    { type: "elbow",    side: "right" },

    right_thigh_yaw:     { type: "thigh",    side: "right" },
    right_thigh_roll:    { type: "thigh",    side: "right" },
    right_thigh_pitch:   { type: "thigh",    side: "right" },
    right_knee_pitch:    { type: "knee",     side: "right" },
    right_foot_pitch:    { type: "foot",     side: "right" },
    right_foot_roll:     { type: "foot",     side: "right" }
};

// Tag a GLB object as a joint
Joints.tag = function (obj) {
    obj.userData.isJoint = true;

    const meta = Joints.meta[obj.name];
    if (meta) {
        obj.userData.jointType = meta.type;
        obj.userData.side = meta.side || null;
    }
};

// Called from app.js after GLB load
Joints.applyTags = function (model) {
    model.traverse(obj => {
        if (Joints.names.includes(obj.name)) {
            Joints.tag(obj);
        }
    });
};
