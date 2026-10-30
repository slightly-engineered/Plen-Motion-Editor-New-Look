export const PLEN = {
    hex16(value) {
        let v = value & 0xFFFF;
        return v.toString(16).padStart(4, "0").toUpperCase();
    },

    hex8(id) {
        return id.toString(16).padStart(2, "0").toUpperCase();
    },

    // ---- Controller Commands ----
    diff(joint, diff) {
        return `MD${this.hex8(joint)}${this.hex16(diff)}`;
    },

    absolute(joint, angle) {
        return `MA${this.hex8(joint)}${this.hex16(angle)}`;
    },

    home() {
        return "MH";
    },

    play(slot) {
        return `MP${this.hex8(slot)}`;
    },

    stop() {
        return "MS";
    },

    // ---- Interpreter ----
    pop() { return "IC"; },
    reset() { return "IR"; },
    push(slot, loops) {
        return `IP${this.hex8(slot)}${this.hex8(loops)}`;
    },

    // ---- Getters ----
    getJointSettings() { return "GJ"; },
    getMotion(slot) { return `GM${this.hex8(slot)}`; },
    getVersion() { return "GV"; }
};
