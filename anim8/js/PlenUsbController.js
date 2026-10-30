// PlenUsbController.js
// Smooth real-time PLEN2 control (per-servo $AN, live + playback)

import { ServoRig } from "../core/servoRig.js";

export class PlenUsbController {
    constructor() {
        this.port = null;
        this.writer = null;

        // PLEN2 joint IDs
        this.servoMap = {
            neck_yaw: 9,

            left_shoulder_pitch: 0,
            left_shoulder_roll: 2,
            left_elbow_roll: 3,

            left_thigh_yaw: 1,
            left_thigh_roll: 4,
            left_thigh_pitch: 5,
            left_knee_pitch: 6,
            left_foot_pitch: 7,
            left_foot_roll: 8,

            right_shoulder_pitch: 12,
            right_shoulder_roll: 14,
            right_elbow_roll: 15,

            right_thigh_yaw: 13,
            right_thigh_roll: 16,
            right_thigh_pitch: 17,
            right_knee_pitch: 18,
            right_foot_pitch: 19,
            right_foot_roll: 20
        };

        // Firmware-accurate home offsets (PLEN units)
        this.homeOffset = {
            neck_yaw: -127,            // id 9

            left_shoulder_pitch: 67,   // id 0
            left_shoulder_roll: -10,   // id 2
            left_elbow_roll: -50,      // id 3

            left_thigh_yaw: 11,        // id 1
            left_thigh_roll: 0,        // id 4
            left_thigh_pitch: -216,    // id 5
            left_knee_pitch: 600,      // id 6
            left_foot_pitch: 142,      // id 7
            left_foot_roll: 95,        // id 8

            right_shoulder_pitch: 59,  // id 12
            right_shoulder_roll: 71,   // id 14
            right_elbow_roll: 224,     // id 15

            right_thigh_yaw: 58,       // id 13
            right_thigh_roll: 11,      // id 16
            right_thigh_pitch: 211,    // id 17
            right_knee_pitch: -368,    // id 18
            right_foot_pitch: -47,     // id 19
            right_foot_roll: 111       // id 20
        };
    }

    /* ----------------------------------------------------------
     * USB CONNECTION
     * ---------------------------------------------------------- */
    async connect() {
        this.port = await navigator.serial.requestPort();
        await this.port.open({ baudRate: 115200 });
        this.writer = this.port.writable.getWriter();
        console.log("USB connected.");
    }

    async disconnect() {
        if (this.writer) {
            this.writer.releaseLock();
            this.writer = null;
        }

        if (this.port) {
            await this.port.close();
            this.port = null;
        }

        console.log("USB disconnected.");
    }

    /* ----------------------------------------------------------
     * RAW WRITE SUPPORT
     * ---------------------------------------------------------- */
    async writeRaw(cmd) {
        if (!this.writer) {
            console.warn("writeRaw() called but writer is null");
            return;
        }
        const data = new TextEncoder().encode(cmd);
        await this.writer.write(data);
    }

    /* ----------------------------------------------------------
     * ENCODING HELPERS
     * ---------------------------------------------------------- */
    encodeAngle12(angle) {
        let v = Math.round(angle);

        if (v < -2048) v = -2048;
        if (v >  2047) v =  2047;

        if (v < 0) v = 0x1000 + v;

        v &= 0x0FFF;

        return v.toString(16).padStart(3, "0").toUpperCase();
    }

    encodeJointId(id) {
        return id.toString(16).padStart(2, "0").toUpperCase();
    }

    /* ----------------------------------------------------------
     * SERVO COMMANDS
     * ---------------------------------------------------------- */
async sendSingle(servoName, diffAngle) {
    if (!this.writer) return;

    const id = this.servoMap[servoName];
    if (id === undefined) return;

    const base = this.homeOffset[servoName] || 0;
    const plenAngle = base + diffAngle;

    // DEBUG: print exactly what Anim8 is sending
    console.log(
        `[SEND] ${servoName} → diff=${diffAngle}, base=${base}, plenAngle=${plenAngle}, id=${id}`
    );

    const jid  = this.encodeJointId(id);
    const ahex = this.encodeAngle12(plenAngle);

    const cmd = `$AN${jid}${ahex}`;

    await this.writeRaw(cmd);
}

}
