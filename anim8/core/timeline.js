// timeline.js (ESM)
// Smooth PLEN-style timeline with:
// 1) Auto-created frame 0
// 2) No empty frames
// 3) Correct playback behavior
// 4) Servo-safe interpolation
// 5) Stable timing
// 6) Loop + Jump support (NEW)

export const Timeline = {

    frames: [],
    currentFrame: 0,
    playing: false,
    lastTime: 0,
    elapsed: 0,

    // Motion props injected from app.js
    motionProps: null,

    // ------------------------------------------------------------
    // Initialize timeline — auto-create Frame 0
    // ------------------------------------------------------------
    init(rig) {
        if (this.frames.length === 0) {
            const frame = this.createFrame();
            this.captureFrame(frame.index, rig);
        }
    },

    // ------------------------------------------------------------
    // Create a new frame object
    // ------------------------------------------------------------
    createFrame() {
        const index = this.frames.length;
        const frame = {
            index,
            angles: {},
            transition: 300
        };
        this.frames.push(frame);
        return frame;
    },

    // ------------------------------------------------------------
    // Capture current rig pose into a frame
    // ------------------------------------------------------------
    captureFrame(index, rig) {
        if (!rig || !this.frames[index]) return;
        this.frames[index].angles = { ...rig.getAngleMap() };
    },

    // ------------------------------------------------------------
    // Apply a frame to the rig (snap)
    // ------------------------------------------------------------
    applyFrame(index, rig) {
        if (!rig || !this.frames[index]) return;
        rig.applyAngleMap(this.frames[index].angles);
    },

    // ------------------------------------------------------------
    // Add a new frame
    // ------------------------------------------------------------
    addFrame(rig) {
        const frame = this.createFrame();
        this.captureFrame(frame.index, rig);
        return frame.index;
    },

    // ------------------------------------------------------------
    // Re-stamp every frame's .index to match its array position.
    // Must be called after any insert/delete/reorder.
    // ------------------------------------------------------------
    reindex() {
        this.frames.forEach((frame, i) => { frame.index = i; });
    },

    // ------------------------------------------------------------
    // Insert a new frame at a specific position (PLEN-style
    // "click between two frames" insertion), capturing the
    // current rig pose into it.
    //
    // position is the array index the new frame should occupy,
    // i.e. insertFrameAt(2, rig) places the new frame so it
    // becomes frames[2], pushing the old frames[2..] back by one.
    // ------------------------------------------------------------
    insertFrameAt(position, rig) {
        const clamped = Math.max(0, Math.min(position, this.frames.length));

        const frame = {
            index: clamped,
            angles: {},
            transition: 300
        };

        this.frames.splice(clamped, 0, frame);
        this.reindex();

        if (rig) {
            this.captureFrame(clamped, rig);
        }

        return clamped;
    },

    // ------------------------------------------------------------
    // Delete a frame by index. Keeps at least one frame around
    // (frame 0 is never deleted from a 1-frame timeline) and
    // clamps currentFrame so it stays valid.
    // ------------------------------------------------------------
    deleteFrame(index) {
        if (this.frames.length <= 1) return this.currentFrame;
        if (index < 0 || index >= this.frames.length) return this.currentFrame;

        this.frames.splice(index, 1);
        this.reindex();

        if (this.currentFrame >= this.frames.length) {
            this.currentFrame = this.frames.length - 1;
        } else if (this.currentFrame > index) {
            this.currentFrame--;
        }
        // if currentFrame === index, it now naturally points at the
        // frame that took its place (or the previous one if it was last)

        return this.currentFrame;
    },

    prevFrame() {
        this.currentFrame--;
        if (this.currentFrame < 0) {
            this.currentFrame = this.frames.length - 1;
        }
    },

    nextFrame() {
        this.currentFrame++;
        if (this.currentFrame >= this.frames.length) {
            this.currentFrame = 0;
        }
    },

    play() {
        if (this.frames.length === 0) return;
        this.playing = true;
        this.lastTime = performance.now();
        this.elapsed = 0;
    },

    stop() {
        this.playing = false;
    },

    // ------------------------------------------------------------
    // Smooth interpolation helper
    // ------------------------------------------------------------
    smoothLerp(a, b, t) {
        const tt = t * t * (3 - 2 * t);
        return a + (b - a) * tt;
    },

    // ------------------------------------------------------------
    // NEW: Loop + Jump logic
    // ------------------------------------------------------------
    computeNextFrame(i) {
        const mp = this.motionProps;
        const last = this.frames.length - 1;

        // --- LOOP ---
        if (mp?.loop?.enabled) {
            const begin = mp.loop.begin;
            const end   = mp.loop.end;

            // If we're inside the loop range
            if (i >= begin && i < end) {
                return i + 1;
            }

            // If we just reached the end of the loop
            if (i === end) {
                // Infinite loop
                if (mp.loop.count === 255) {
                    return begin;
                }

                // Finite loop
                if (mp.loop.count > 1) {
                    mp.loop.count--;
                    return begin;
                }

                // Loop exhausted → fall through to normal behavior
            }
        }

        // --- JUMP ---
        if (mp?.jump?.enabled) {
            const begin = mp.jump.begin;
            const end   = mp.jump.end;
            const slot  = mp.jump.slot;

            if (i >= begin && i < end) {
                return i + 1;
            }

            if (i === end) {
                return slot;
            }
        }

        // --- NORMAL WRAP ---
        return (i + 1 > last) ? 0 : i + 1;
    },

    // ------------------------------------------------------------
    // Update timeline (called every frame from app.js)
    // ------------------------------------------------------------
    update(rig) {
        if (!this.playing || this.frames.length < 2) return;

        const now = performance.now();
        const dt = now - this.lastTime;
        this.lastTime = now;

        this.elapsed += dt;

        const i = this.currentFrame;
        const next = this.computeNextFrame(i);

        const frameA = this.frames[i];
        const frameB = this.frames[next];

        const duration = frameA.transition;
        let t = this.elapsed / duration;
        if (t > 1) t = 1;

        // Smooth interpolation
        const blended = {};
        for (const name in frameA.angles) {
            blended[name] = this.smoothLerp(
                frameA.angles[name],
                frameB.angles[name],
                t
            );
        }

        rig.applyAngleMap(blended);

        // Advance to next frame
        if (this.elapsed >= duration) {
            this.currentFrame = next;
            this.elapsed = 0;
        }
    }
};
