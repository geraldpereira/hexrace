/**
 * AudioWorklet processor for everything around the car that isn't the
 * engine or a sliding tyre:
 * - rolling noise, one voice per surface (tyre roar under a low-pass, a
 *   random train of stone / clod grains, a rumble), driven by how many
 *   wheels roll on it and how fast;
 * - wind, low-passed noise opening and swelling with speed, with gusts;
 * - suspension thumps sent as events: a low sine knock plus a body creak,
 *   harder and with a metallic ring when the suspension bottoms out.
 */
export const CHASSIS_PROCESSOR_SOURCE = `
class Biquad {
    constructor() { this.x1 = 0; this.x2 = 0; this.y1 = 0; this.y2 = 0; this.lowpass(1000, 0.7); }
    bandpass(freq, q) {
        const w = 2 * Math.PI * Math.min(freq, sampleRate * 0.45) / sampleRate;
        const alpha = Math.sin(w) / (2 * q);
        const a0 = 1 + alpha;
        this.b0 = alpha / a0; this.b1 = 0; this.b2 = -alpha / a0;
        this.a1 = (-2 * Math.cos(w)) / a0; this.a2 = (1 - alpha) / a0;
    }
    lowpass(freq, q) {
        const w = 2 * Math.PI * Math.min(freq, sampleRate * 0.45) / sampleRate;
        const alpha = Math.sin(w) / (2 * q);
        const c = Math.cos(w);
        const a0 = 1 + alpha;
        this.b0 = ((1 - c) / 2) / a0; this.b1 = (1 - c) / a0; this.b2 = this.b0;
        this.a1 = (-2 * c) / a0; this.a2 = (1 - alpha) / a0;
    }
    run(x) {
        const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
        this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
        return y;
    }
}

class RollVoice {
    constructor(params) {
        this.params = params;
        this.intensity = 0; this.target = 0;
        this.hissLp = new Biquad(); this.grainLp = new Biquad(); this.rumbleLp = new Biquad();
        this.grains = [];
        this.grainNoise = 0;
        this.wander = 0;
        // Patchiness: the ground isn't uniform, the grain density drifts
        // over a second or two like driving through looser and firmer bits.
        this.patch = 0;
    }
}

class ChassisProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.rolls = [];
        this.speed = 0; this.speedSmooth = 0;
        this.windLevel = 0.9; this.windFullSpeed = 40;
        this.windLp = new Biquad(); this.gust = 0;
        this.thumps = [];
        this.creakBp = new Biquad(); this.ringBp = new Biquad();
        this.creakBp.bandpass(400, 2); this.ringBp.bandpass(1600, 12);
        this.port.onmessage = (e) => {
            const d = e.data;
            if (d.surfaces) this.rolls = d.surfaces.map((p) => new RollVoice(p));
            if (d.params !== undefined && this.rolls[d.index]) this.rolls[d.index].params = d.params;
            if (d.intensities) {
                for (let i = 0; i < d.intensities.length && i < this.rolls.length; i++) this.rolls[i].target = d.intensities[i];
            }
            if (d.speed !== undefined) this.speed = d.speed;
            if (d.windLevel !== undefined) this.windLevel = d.windLevel;
            if (d.windFullSpeed !== undefined) this.windFullSpeed = d.windFullSpeed;
            if (d.thumps) for (const t of d.thumps) this.addThump(t);
        };
    }

    addThump(t) {
        this.thumps.push({
            t: 0,
            dur: (t.hard ? 0.09 : 0.07) + Math.random() * 0.06,
            freq: (t.hard ? 70 : 50) + Math.random() * 30,
            amp: t.amp * (0.8 + Math.random() * 0.4),
            hard: t.hard,
            phase: Math.random() * 6.28,
        });
    }

    process(inputs, outputs) {
        const out = outputs[0][0];
        if (!out) return true;
        const sr = sampleRate;
        out.fill(0);
        this.speedSmooth += (this.speed - this.speedSmooth) * 0.05;
        const speedFactor = Math.min(1, this.speedSmooth / 25);

        // Rolling voices.
        for (const v of this.rolls) {
            const p = v.params;
            if (v.target <= 0.001 && v.intensity <= 0.001) { v.intensity = 0; continue; }
            v.wander += (Math.random() - 0.5) * 0.1 - v.wander * 0.02;
            v.patch += (Math.random() - 0.5) * 0.05 - v.patch * 0.004;
            const patch = Math.max(-1, Math.min(1, v.patch));
            v.hissLp.lowpass(p.hissFreq * (0.5 + 0.6 * speedFactor) * (1 + 0.1 * v.wander), 0.7);
            v.grainLp.lowpass(1400 + 1400 * speedFactor, 0.7);
            v.rumbleLp.lowpass(90 + 90 * speedFactor, 0.9);
            const grainRate = p.grainRate * (0.15 + 0.85 * speedFactor) * (1 + 0.6 * patch);
            const grainNorm = 1 / Math.sqrt(1 + grainRate / 250);
            for (let i = 0; i < out.length; i++) {
                v.intensity += (v.target - v.intensity) * 0.001;
                const it = v.intensity;
                const white = Math.random() * 2 - 1;
                let y = v.hissLp.run(white) * p.hiss * (1 + 0.15 * v.wander);
                y += v.rumbleLp.run(white) * p.rumble * 3;
                if (p.grainRate > 0) {
                    if (Math.random() < (grainRate * it) / sr) {
                        const stone = Math.random() < 0.05;
                        v.grains.push({ t: 0, dur: p.grainDur * (0.5 + Math.random() * 1.2) * (stone ? 2.5 : 1), amp: (0.3 + Math.random() * 1.2) * (stone ? 2.2 : 1) });
                        // Now and then a stone flies up into the wheel arch.
                        if (stone && Math.random() < 0.3) this.addThump({ amp: 0.12 + 0.15 * speedFactor, hard: false });
                    }
                    v.grainNoise += (white - v.grainNoise) * 0.3;
                    let g = 0;
                    for (let k = v.grains.length - 1; k >= 0; k--) {
                        const gr = v.grains[k];
                        const u = gr.t / gr.dur;
                        if (u >= 1) { v.grains.splice(k, 1); continue; }
                        const env = u < 0.2 ? u * 5 : Math.exp(-(u - 0.2) * 4);
                        g += gr.amp * v.grainNoise * env;
                        gr.t += 1 / sr;
                    }
                    y += v.grainLp.run(g) * p.grainLevel * 1.2 * grainNorm;
                }
                out[i] += y * it;
            }
        }

        // Wind.
        const wf = Math.min(1, this.speedSmooth / this.windFullSpeed);
        if (wf > 0.02) {
            this.gust += (Math.random() - 0.5) * 0.08 - this.gust * 0.01;
            const g = Math.max(-1, Math.min(1, this.gust));
            this.windLp.lowpass(150 + 1600 * wf * (1 + 0.2 * g), 0.6);
            const level = this.windLevel * wf * wf * (1 + 0.3 * g);
            for (let i = 0; i < out.length; i++) {
                out[i] += this.windLp.run(Math.random() * 2 - 1) * level * 2.5;
            }
        }

        // Suspension thumps.
        if (this.thumps.length) {
            for (let i = 0; i < out.length; i++) {
                let v = 0;
                for (let k = this.thumps.length - 1; k >= 0; k--) {
                    const th = this.thumps[k];
                    const u = th.t / th.dur;
                    if (u >= 1) { this.thumps.splice(k, 1); continue; }
                    const env = Math.exp(-u * 5);
                    const knock = Math.sin(th.phase + 2 * Math.PI * th.freq * th.t * (1 - 0.25 * u));
                    const noise = Math.random() * 2 - 1;
                    const creak = this.creakBp.run(noise) * Math.exp(-u * 12) * 2;
                    let s = th.amp * env * (knock * 0.9 + creak * 0.6);
                    if (th.hard) s += th.amp * this.ringBp.run(noise) * Math.exp(-u * 8) * 3;
                    v += s;
                    th.t += 1 / sr;
                }
                out[i] += v;
            }
        }

        for (let i = 0; i < out.length; i++) out[i] = Math.tanh(out[i]);
        for (let c = 1; c < outputs[0].length; c++) outputs[0][c].set(out);
        return true;
    }
}
registerProcessor('chassis-processor', ChassisProcessor);
`;
