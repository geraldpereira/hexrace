/**
 * AudioWorklet processor for tyre slide noise, one voice per surface. Each
 * voice mixes two models by its `tone`: a squeal (white noise through a
 * sharp resonance whose pitch wanders and rises with the slide) and a
 * crunch (a random train of short noise grains under a low-pass, plus a
 * bed of rumble). The main thread sends the per-surface slide intensity
 * every frame and the surface parameters when they change.
 */
export const TYRE_PROCESSOR_SOURCE = `
class Biquad {
    constructor() { this.x1 = 0; this.x2 = 0; this.y1 = 0; this.y2 = 0; this.bandpass(1000, 1); }
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

class Voice {
    constructor(params) {
        this.params = params;
        this.intensity = 0; this.target = 0;
        this.bp1 = new Biquad(); this.bp2 = new Biquad();
        this.lp = new Biquad(); this.rumble = new Biquad();
        this.grains = [];
        this.wander = 0; this.lfo = Math.random() * 6.28;
    }
}

class TyreProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.voices = [];
        this.speed = 0;
        this.port.onmessage = (e) => {
            const d = e.data;
            if (d.surfaces) this.voices = d.surfaces.map((p) => new Voice(p));
            if (d.params !== undefined && this.voices[d.index]) this.voices[d.index].params = d.params;
            if (d.intensities) {
                for (let i = 0; i < d.intensities.length && i < this.voices.length; i++) this.voices[i].target = d.intensities[i];
            }
            if (d.speed !== undefined) this.speed = d.speed;
        };
    }

    process(inputs, outputs) {
        const out = outputs[0][0];
        if (!out) return true;
        const sr = sampleRate;
        out.fill(0);
        for (const v of this.voices) {
            const p = v.params;
            if (v.target <= 0.001 && v.intensity <= 0.001) { v.intensity = 0; continue; }
            // Per-block filter update: the squeal pitch wanders slowly and
            // climbs with the slide; the crunch cutoff opens with speed.
            v.wander += (Math.random() - 0.5) * 0.06 - v.wander * 0.02;
            v.lfo += 0.0008 * out.length;
            const pitch = p.freq * (1 + 0.18 * v.intensity + 0.04 * v.wander + 0.02 * Math.sin(v.lfo * 5));
            v.bp1.bandpass(pitch, p.q);
            v.bp2.bandpass(pitch * 2.02, p.q * 0.8);
            v.lp.lowpass(p.freq * (0.7 + 0.5 * Math.min(1, this.speed / 25)), 0.9);
            v.rumble.lowpass(160, 0.8);
            for (let i = 0; i < out.length; i++) {
                v.intensity += (v.target - v.intensity) * 0.002;
                const it = v.intensity;
                const white = Math.random() * 2 - 1;
                let y = 0;
                if (p.tone > 0) {
                    // Stick-slip flutter: the squeal amplitude shivers.
                    const flutter = 0.8 + 0.2 * Math.sin(v.lfo * 31 + i * 0.01);
                    y += p.tone * (v.bp1.run(white) * 2.5 + v.bp2.run(white) * 0.8) * flutter;
                }
                if (p.tone < 1) {
                    if (p.grainRate > 0 && Math.random() < (p.grainRate * (0.3 + 0.7 * it)) / sr) {
                        v.grains.push({ t: 0, dur: p.grainDur * (0.6 + Math.random() * 0.8), amp: 0.5 + Math.random() });
                    }
                    let g = 0;
                    for (let k = v.grains.length - 1; k >= 0; k--) {
                        const gr = v.grains[k];
                        const u = gr.t / gr.dur;
                        if (u >= 1) { v.grains.splice(k, 1); continue; }
                        g += gr.amp * (Math.random() * 2 - 1) * Math.exp(-u * 4);
                        gr.t += 1 / sr;
                    }
                    y += (1 - p.tone) * (v.lp.run(g * 1.6 + white * 0.12) + v.rumble.run(white) * 1.2);
                }
                out[i] += y * p.level * Math.pow(it, 1.3);
            }
        }
        for (let i = 0; i < out.length; i++) out[i] = Math.tanh(out[i]);
        for (let c = 1; c < outputs[0].length; c++) outputs[0][c].set(out);
        return true;
    }
}
registerProcessor('tyre-processor', TyreProcessor);
`;
