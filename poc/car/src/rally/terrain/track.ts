import * as THREE from 'three';
import type { Heightmap } from './heightmap';
import { mulberry32 } from '../../engine/tools/math';

export interface TrackOptions {
    width: number;
    feather: number;
    controlPoints: number;
    radiusRatio: number;
    radialJitter: number;
    smoothingWindow: number;
    seed: number;
}

const DEFAULTS: TrackOptions = {
    width: 6,
    feather: 4,
    controlPoints: 12,
    radiusRatio: 0.32,
    radialJitter: 0.18,
    smoothingWindow: 8,
    seed: 1337,
};

/** Generates a closed-loop track and carves it into the heightmap in place. */
export class Track {
    readonly width: number;
    readonly feather: number;
    readonly curve: THREE.CatmullRomCurve3;
    /** Distance (m) from the track centreline per heightmap sample, same layout as the heights. */
    readonly distanceField: Float32Array;

    constructor(heightmap: Heightmap, options: Partial<TrackOptions> = {}) {
        const o = { ...DEFAULTS, ...options };
        this.width = o.width;
        this.feather = o.feather;
        this.curve = Track.buildCurve(heightmap.size, o);

        const sampleCount = Math.max(64, Math.round(this.curve.getLength() / 1.5));
        // getSpacedPoints returns sampleCount+1 points (first == last on a closed curve);
        // drop the duplicate so wrap-around segments k → (k+1) % N stay non-degenerate.
        const samples = this.curve.getSpacedPoints(sampleCount).slice(0, sampleCount);
        const sampleHeights = samples.map((p) => heightmap.heightAt(p.x, p.z));
        const smoothedHeights = Track.smoothLoop(sampleHeights, o.smoothingWindow);

        const { distance, trackHeight } = Track.buildFields(heightmap, samples, smoothedHeights);
        Track.carve(heightmap, distance, trackHeight, this.width, this.feather);
        this.distanceField = distance;
    }

    private static buildCurve(size: number, o: TrackOptions): THREE.CatmullRomCurve3 {
        const rng = mulberry32(o.seed);
        const baseRadius = size * o.radiusRatio;
        const jitter = size * o.radialJitter;
        const points: THREE.Vector3[] = [];
        for (let k = 0; k < o.controlPoints; k++) {
            const angle = (k / o.controlPoints) * Math.PI * 2;
            const r = baseRadius + (rng() - 0.5) * jitter;
            points.push(new THREE.Vector3(Math.cos(angle) * r, 0, Math.sin(angle) * r));
        }
        return new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.5);
    }

    private static buildFields(
        heightmap: Heightmap,
        samples: THREE.Vector3[],
        smoothedHeights: number[],
    ): { distance: Float32Array; trackHeight: Float32Array } {
        const n = heightmap.segments + 1;
        const step = heightmap.size / heightmap.segments;
        const half = heightmap.size / 2;
        const distance = new Float32Array(n * n);
        const trackHeight = new Float32Array(n * n);

        const sCount = samples.length;
        for (let j = 0; j < n; j++) {
            const z = j * step - half;
            for (let i = 0; i < n; i++) {
                const x = i * step - half;
                let bestD2 = Infinity;
                let bestA = 0;
                let bestT = 0;
                for (const [k, a] of samples.entries()) {
                    const b = samples[(k + 1) % sCount] ?? a;
                    const sx = b.x - a.x;
                    const sz = b.z - a.z;
                    const len2 = sx * sx + sz * sz;
                    const t =
                        len2 > 0
                            ? Math.max(0, Math.min(1, ((x - a.x) * sx + (z - a.z) * sz) / len2))
                            : 0;
                    const cx = a.x + sx * t;
                    const cz = a.z + sz * t;
                    const dx = x - cx;
                    const dz = z - cz;
                    const d2 = dx * dx + dz * dz;
                    if (d2 < bestD2) {
                        bestD2 = d2;
                        bestA = k;
                        bestT = t;
                    }
                }
                const idx = i + j * n;
                distance[idx] = Math.sqrt(bestD2);
                const ha = smoothedHeights[bestA] ?? 0;
                const hb = smoothedHeights[(bestA + 1) % sCount] ?? 0;
                trackHeight[idx] = ha * (1 - bestT) + hb * bestT;
            }
        }
        return { distance, trackHeight };
    }

    private static carve(
        heightmap: Heightmap,
        distance: Float32Array,
        trackHeight: Float32Array,
        width: number,
        feather: number,
    ): void {
        const halfW = width / 2;
        const outer = halfW + feather;
        for (const [k, h] of heightmap.heights.entries()) {
            const d = distance[k] ?? 0;
            if (d > outer) continue;
            const t = 1 - THREE.MathUtils.smoothstep(d, halfW, outer);
            heightmap.heights[k] = h * (1 - t) + (trackHeight[k] ?? 0) * t;
        }
    }

    private static smoothLoop(values: number[], window: number): number[] {
        const n = values.length;
        const out = new Array<number>(n);
        let sum = 0;
        for (let k = -window; k <= window; k++) sum += values[(k + n) % n] ?? 0;
        const norm = 1 / (2 * window + 1);
        for (let i = 0; i < n; i++) {
            out[i] = sum * norm;
            const drop = values[(i - window + n) % n] ?? 0;
            const add = values[(i + window + 1) % n] ?? 0;
            sum += add - drop;
        }
        return out;
    }
}
