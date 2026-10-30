// exporter.js — Legacy PLEN Motion Format Exporter
// Produces motion files identical to the old MotionEditor syntax.

import { ServoRig } from "./servoRig.js";

export const Exporter = {

    // ------------------------------------------------------------
    // Export Timeline → Legacy PLEN Motion JSON
    // ------------------------------------------------------------
    exportMotion(timeline, options = {}) {

        // ❗ FIXED: frameLength must match actual number of frames
        const frameLength = timeline.frames.length;

        const name = options.name ?? "New Motion";
        const slot = options.slot ?? 0;

        // Code block — only include loop/jump if enabled
        const codes = [];

        if (options.loop && options.loop.enabled) {
            codes.push({
                method: "loop",
                arguments: [
                    options.loop.begin ?? 0,
                    options.loop.end ?? 0,
                    options.loop.count ?? 255
                ]
            });
        }

        if (options.jump && options.jump.enabled) {
            codes.push({
                method: "jump",
                arguments: [
                    options.jump.begin ?? 0,
                    options.jump.end ?? 0,
                    options.jump.slot ?? 0
                ]
            });
        }

        const motion = {
            "@frame_length": frameLength,   // ← FIXED
            "@metadata": {
                "author": options.author ?? "PLEN Project Company Inc.",
                "required_firmware": "1.4.1~",
                "target": "PLEN1.4"
            },
            "codes": codes,
            "frames": [],
            "name": name,
            "slot": slot
        };

        // --------------------------------------------------------
        // Convert each Timeline frame → PLEN legacy frame
        // --------------------------------------------------------
        timeline.frames.forEach((frame, index) => {
            const outputs = [];

            for (const servoName in frame.angles) {
                outputs.push({
                    device: servoName,
                    value: frame.angles[servoName] // already in 0.1° units
                });
            }

            motion.frames.push({
                "@index": index,
                "outputs": outputs,
                "transition_time_ms": frame.transition ?? 300
            });
        });

        return motion;
    },

    // ------------------------------------------------------------
    // Download motion JSON
    // ------------------------------------------------------------
    downloadMotion(motion, filename = "motion.json") {
        const blob = new Blob([JSON.stringify(motion, null, 2)], {
            type: "application/json"
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
};
