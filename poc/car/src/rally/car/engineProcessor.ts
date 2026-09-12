/**
 * AudioWorklet processor for the engine, shipped as source text so it can be
 * loaded from a Blob URL in both dev and build without a separate asset.
 *
 * Model: every cylinder firing is a short pressure pulse (raised cosine plus
 * a burst of noise). The pulses land on the crank cycle with a fixed small
 * offset and gain per cylinder, plus per-firing jitter, so the train is
 * uneven like a real engine. The train then rings three fixed exhaust
 * resonances (band-passes) and a pipe comb filter, gets intake hiss on
 * load, and is soft-clipped. Messages from the main thread set rpm, load
 * and the tuning parameters.
 */
export const ENGINE_PROCESSOR_SOURCE = `
class Biquad {
    constructor() { this.x1 = 0; this.x2 = 0; this.y1 = 0; this.y2 = 0; this.set(100, 1); }
    set(freq, q) {
        const w = 2 * Math.PI * Math.min(freq, sampleRate * 0.45) / sampleRate;
        const alpha = Math.sin(w) / (2 * q);
        const a0 = 1 + alpha;
        this.b0 = alpha / a0; this.b1 = 0; this.b2 = -alpha / a0;
        this.a1 = (-2 * Math.cos(w)) / a0; this.a2 = (1 - alpha) / a0;
    }
    run(x) {
        const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
        this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
        return y;
    }
}

class EngineProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.rpm = 800; this.targetRpm = 800;
        this.load = 0; this.targetLoad = 0;
        this.cylinders = 4;
        this.exhaustHz = 110;
        this.resonance = 1;
        this.intakeNoise = 0.15;
        this.drive = 1.5;
        this.wobble = 0.02;
        this.limiter = false;
        this.limiterHz = 14;
        this.limiterPhase = 0;
        this.limiterGate = true;
        this.popLevel = 1;
        this.pops = [];
        this.phase = 0;
        this.nextFire = 0;
        this.pulses = [];
        this.rebuildCylinders();
        this.bands = [new Biquad(), new Biquad(), new Biquad()];
        this.setResonance();
        this.comb = new Float32Array(8192);
        this.combIdx = 0;
        this.noiseLp = 0;
        this.wobbleValue = 0;
        this.port.onmessage = (e) => {
            const d = e.data;
            if (d.rpm !== undefined) this.targetRpm = d.rpm;
            if (d.load !== undefined) this.targetLoad = d.load;
            if (d.cylinders !== undefined && d.cylinders !== this.cylinders) {
                this.cylinders = d.cylinders; this.rebuildCylinders();
            }
            if (d.exhaustHz !== undefined) this.exhaustHz = d.exhaustHz;
            if (d.resonance !== undefined) { this.resonance = d.resonance; this.setResonance(); }
            if (d.intakeNoise !== undefined) this.intakeNoise = d.intakeNoise;
            if (d.drive !== undefined) this.drive = d.drive;
            if (d.wobble !== undefined) this.wobble = d.wobble;
            if (d.limiter !== undefined) this.limiter = d.limiter;
            if (d.limiterHz !== undefined) this.limiterHz = d.limiterHz;
            if (d.popLevel !== undefined) this.popLevel = d.popLevel;
            if (d.pops !== undefined) this.schedulePops(d.pops);
        };
    }

    rebuildCylinders() {
        // Deterministic per-cylinder character: timing offset (fraction of
        // a firing slot) and gain, so the same engine always sounds the same.
        this.cylOff = []; this.cylGain = [];
        let seed = 1234567;
        const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
        for (let i = 0; i < this.cylinders; i++) {
            this.cylOff.push(rnd() * 0.08);
            this.cylGain.push(0.85 + rnd() * 0.3);
        }
        this.nextFire = 0; this.phase = 0;
    }

    schedulePops(count) {
        // A few bangs spread over half a second, the first one soon.
        let delay = 0.03 + Math.random() * 0.08;
        for (let i = 0; i < count; i++) {
            this.pops.push({ delay, amp: (0.7 + Math.random() * 0.6) * this.popLevel });
            delay += 0.08 + Math.random() * 0.18;
        }
    }

    setResonance() {
        const r = this.resonance;
        this.bands[0].set(95 * r, 5);
        this.bands[1].set(230 * r, 4);
        this.bands[2].set(520 * r, 3);
    }

    process(inputs, outputs) {
        const out = outputs[0][0];
        if (!out) return true;
        const sr = sampleRate;
        const n = this.cylinders;
        const combLen = Math.max(2, Math.min(this.comb.length - 1, Math.round(sr / (2 * this.exhaustHz))));
        for (let i = 0; i < out.length; i++) {
            // Smooth the controls, they arrive at frame rate.
            this.rpm += (this.targetRpm - this.rpm) * 0.0015;
            this.load += (this.targetLoad - this.load) * 0.003;
            // Idle wobble: a slow random walk on the rpm, fading out with revs.
            this.wobbleValue += (Math.random() - 0.5) * 0.002 - this.wobbleValue * 0.0005;
            const wobbleAmt = this.wobble * Math.max(0, 1 - this.rpm / 3000);
            const rpm = this.rpm * (1 + this.wobbleValue * wobbleAmt * 50);

            // Rev limiter: a square gate on the ignition. Each cut lets a
            // little unburnt fuel through, so it sometimes pops in the pipe.
            let cut = 1;
            if (this.limiter) {
                this.limiterPhase += this.limiterHz / sr;
                if (this.limiterPhase >= 1) this.limiterPhase -= 1;
                const gate = this.limiterPhase < 0.5;
                if (!gate && this.limiterGate && Math.random() < 0.5) {
                    this.pops.push({ delay: 0.005, amp: (0.3 + Math.random() * 0.3) * this.popLevel });
                }
                this.limiterGate = gate;
                if (!gate) cut = 0.08;
            }

            // Scheduled pops: long, noisy, loud pulses.
            for (let p = this.pops.length - 1; p >= 0; p--) {
                const pop = this.pops[p];
                pop.delay -= 1 / sr;
                if (pop.delay <= 0) {
                    this.pops.splice(p, 1);
                    this.pulses.push({ t: 0, dur: 0.012 + Math.random() * 0.012, amp: pop.amp * 2.5, noise: 1.6 });
                }
            }

            // Four-stroke: one crank cycle here is two revolutions; each
            // cylinder fires once per cycle in its own slot.
            const cyclesPerSec = rpm / 120;
            this.phase += cyclesPerSec / sr;
            for (;;) {
                const slot = (this.nextFire + this.cylOff[this.nextFire]) / n;
                if (this.phase < slot) break;
                const slotDur = 1 / (n * cyclesPerSec);
                const amp = (0.45 + 0.55 * this.load) * cut * this.cylGain[this.nextFire] * (0.9 + Math.random() * 0.2);
                // Pulse shorter than the slot, a little longer at low load (lazy burn).
                const dur = Math.min(0.004 * (1.2 - 0.4 * this.load), slotDur * 0.6);
                this.pulses.push({ t: 0, dur, amp, noise: 0.6 });
                this.nextFire++;
                if (this.nextFire === n) { this.nextFire = 0; this.phase -= 1; }
            }

            // Sum the live pulses: raised cosine plus a decaying noise burst.
            let x = 0;
            for (let p = this.pulses.length - 1; p >= 0; p--) {
                const pu = this.pulses[p];
                const u = pu.t / pu.dur;
                if (u >= 1) { this.pulses.splice(p, 1); continue; }
                const env = 0.5 * (1 - Math.cos(2 * Math.PI * u));
                const burst = (Math.random() * 2 - 1) * Math.exp(-u * 6) * pu.noise;
                x += pu.amp * (env + burst);
                pu.t += 1 / sr;
            }

            // Exhaust: fixed resonances plus the pipe's comb.
            let y = 0.15 * x + this.bands[0].run(x) * 1.0 + this.bands[1].run(x) * 0.7 + this.bands[2].run(x) * 0.4;
            const readIdx = (this.combIdx - combLen + this.comb.length) % this.comb.length;
            y += 0.55 * this.comb[readIdx];
            this.comb[this.combIdx] = y;
            this.combIdx = (this.combIdx + 1) % this.comb.length;

            // Intake hiss on load, lowpassed, brighter with revs.
            const white = Math.random() * 2 - 1;
            const cutoff = 150 + rpm * 0.25;
            const k = Math.min(1, 2 * Math.PI * cutoff / sr);
            this.noiseLp += (white - this.noiseLp) * k;
            y += this.noiseLp * this.intakeNoise * this.load * Math.min(1, rpm / 2500);

            // Soft clip: warmer under load.
            const g = this.drive * (0.7 + 0.6 * this.load);
            out[i] = Math.tanh(y * g) * 0.6;
        }
        for (let c = 1; c < outputs[0].length; c++) outputs[0][c].set(out);
        return true;
    }
}
registerProcessor('engine-processor', EngineProcessor);
`;
