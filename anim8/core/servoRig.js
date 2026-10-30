// core/servoRig.js
// Canonical servo registry: axis = local hinge axis (with sign), min/max in 0.1° units

export const ServoRig = {

    // 0 — NECK
    neck_yaw: {
        id: 0,
        node: "neck_yaw",
        axis: [0, 1, 0],
        min: -900,
        max: 900
    },

    // 1–3 — LEFT ARM
    left_shoulder_pitch: {
        id: 1,
        node: "left_shoulder_pitch",
        axis: [1, 0, 0],
        min: -900,
        max: 900
    },

    left_shoulder_roll: {
        id: 2,
        node: "left_shoulder_roll",
        axis: [0, 0, -1],
        min: -900,
        max: 900
    },

    left_elbow_roll: {
        id: 3,
        node: "left_elbow_roll",
        axis: [0, 0, 1],
        min: -900,
        max: 900
    },

    // 4–9 — LEFT LEG
    left_thigh_yaw: {
        id: 4,
        node: "left_thigh_yaw",
        axis: [0, 1, 0],
        min: -900,
        max: 900
    },

    left_thigh_roll: {
        id: 5,
        node: "left_thigh_roll",
        axis: [0, 0, 1],
        min: -900,
        max: 900
    },

    left_thigh_pitch: {
        id: 6,
        node: "left_thigh_pitch",
        axis: [1, 0, 0],
        min: -900,
        max: 900
    },

    left_knee_pitch: {
        id: 7,
        node: "left_knee_pitch",
        axis: [1, 0, 0],
        min: -2000,
        max: 900
    },

    left_foot_pitch: {
        id: 8,
        node: "left_foot_pitch",
        axis: [1, 0, 0],
        min: -900,
        max: 900
    },

    left_foot_roll: {
        id: 9,
        node: "left_foot_roll",
        axis: [0, 0, 1],
        min: -900,
        max: 900
    },

    // 10–12 — RIGHT ARM
    right_shoulder_pitch: {
        id: 10,
        node: "right_shoulder_pitch",
        axis: [1, 0, 0],
        min: -900,
        max: 900
    },

    right_shoulder_roll: {
        id: 11,
        node: "right_shoulder_roll",
        axis: [0, 0, 1],
        min: -900,
        max: 900
    },

    right_elbow_roll: {
        id: 12,
        node: "right_elbow_roll",
        axis: [0, 0, 1],
        min: -900,
        max: 900
    },

    // 13–18 — RIGHT LEG
    right_thigh_yaw: {
        id: 13,
        node: "right_thigh_yaw",
        axis: [0, 1, 0],
        min: -900,
        max: 900
    },

    right_thigh_roll: {
        id: 14,
        node: "right_thigh_roll",
        axis: [0, 0, 1],
        min: -900,
        max: 900
    },

    right_thigh_pitch: {
        id: 15,
        node: "right_thigh_pitch",
        axis: [1, 0, 0],
        min: -900,
        max: 900
    },

    right_knee_pitch: {
        id: 16,
        node: "right_knee_pitch",
        axis: [1, 0, 0],
        min: -900,
        max: 900
    },

    right_foot_pitch: {
        id: 17,
        node: "right_foot_pitch",
        axis: [1, 0, 0],
        min: -900,
        max: 900
    },

    right_foot_roll: {
        id: 18,
        node: "right_foot_roll",
        axis: [0, 0, 1],
        min: -900,
        max: 900
    }
};

// ------------------------------------------------------------
// Direction overrides (applied in RigController.getAngle())
// ------------------------------------------------------------

export const jointSign = {
    right_shoulder_roll: -1,
    left_shoulder_pitch: -1,
    left_thigh_pitch: -1,
	left_thigh_roll: -1,
	right_thigh_roll: -1,
    left_knee_pitch: -1,
    right_foot_pitch: -1,
	left_foot_roll:   -1
};
