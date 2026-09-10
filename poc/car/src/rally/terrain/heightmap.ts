import { createNoise2D } from 'simplex-noise';
import { mulberry32 } from '../../engine/tools/math';

export interface HeightmapOptions {
    size: number;
    segments: number;
    amplitude: number;
    frequency: number;
    octaves: number;
    persistence: number;
    lacunarity: number;
    seed?: number;
}

const DEFAULTS: HeightmapOptions = {
    size: 200,
    segments: 500,
    amplitude: 8,
    frequency: 0.01,
    octaves: 3,
    persistence: 0.4,
    lacunarity: 2,
};

export class Heightmap {
    readonly heights: Float32Array;
    readonly size: number;
    readonly segments: number;

    constructor(options: Partial<HeightmapOptions> = {}) {
        const o = { ...DEFAULTS, ...options };
        this.size = o.size;
        this.segments = o.segments;
        this.heights = Heightmap.sample(o);
    }

    heightAt(x: number, z: number): number {
        const fi = (x / this.size + 0.5) * this.segments;
        const fj = (z / this.size + 0.5) * this.segments;
        const i = Math.max(0, Math.min(this.segments - 1, Math.floor(fi)));
        const j = Math.max(0, Math.min(this.segments - 1, Math.floor(fj)));
        const tx = Math.max(0, Math.min(1, fi - i));
        const tz = Math.max(0, Math.min(1, fj - j));
        const n = this.segments + 1;
        const h00 = this.heights[i + j * n] ?? 0;
        const h10 = this.heights[i + 1 + j * n] ?? 0;
        const h01 = this.heights[i + (j + 1) * n] ?? 0;
        const h11 = this.heights[i + 1 + (j + 1) * n] ?? 0;
        const a = h00 * (1 - tx) + h10 * tx;
        const b = h01 * (1 - tx) + h11 * tx;
        return a * (1 - tz) + b * tz;
    }

    private static sample(o: HeightmapOptions): Float32Array {
        const noise = createNoise2D(o.seed !== undefined ? mulberry32(o.seed) : undefined);
        const n = o.segments + 1;
        const heights = new Float32Array(n * n);
        const step = o.size / o.segments;

        let totalAmp = 0;
        for (let k = 0, amp = 1; k < o.octaves; k++, amp *= o.persistence) totalAmp += amp;

        for (let j = 0; j < n; j++) {
            for (let i = 0; i < n; i++) {
                const x = (i - o.segments / 2) * step;
                const z = (j - o.segments / 2) * step;
                let amp = 1;
                let freq = o.frequency;
                let h = 0;
                for (let k = 0; k < o.octaves; k++) {
                    h += noise(x * freq, z * freq) * amp;
                    amp *= o.persistence;
                    freq *= o.lacunarity;
                }
                heights[i + j * n] = (h / totalAmp) * o.amplitude;
            }
        }
        return heights;
    }
}
