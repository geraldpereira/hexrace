import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import type { Heightmap } from './heightmap';
import type { Track } from './track';
import { SURFACE_ASPHALT, SURFACE_DIRT, SURFACE_MUD } from './surfaces';
import { mulberry32 } from '../../engine/tools/math';

export interface SurfaceMapOptions {
    track: number;
    verge: number;
    patches: number;
    patchFrequency: number;
    patchThreshold: number;
    seed: number;
}

export const SURFACE_MAP_DEFAULTS: SurfaceMapOptions = {
    track: SURFACE_ASPHALT,
    verge: SURFACE_DIRT,
    patches: SURFACE_MUD,
    patchFrequency: 0.04,
    patchThreshold: 0.35,
    seed: 4242,
};

/**
 * One surface id per heightmap sample. Shared by the car (grip lookup) and
 * the terrain shader (flat colour per surface) through the same texture.
 */
export class SurfaceMap {
    readonly ids: Uint8Array;
    readonly texture: THREE.DataTexture;
    readonly options: SurfaceMapOptions;
    private readonly n: number;

    constructor(
        private readonly heightmap: Heightmap,
        private readonly track: Track,
        options: Partial<SurfaceMapOptions> = {},
    ) {
        this.options = { ...SURFACE_MAP_DEFAULTS, ...options };
        this.n = heightmap.segments + 1;
        this.ids = new Uint8Array(this.n * this.n);
        this.texture = new THREE.DataTexture(
            this.ids,
            this.n,
            this.n,
            THREE.RedFormat,
            THREE.UnsignedByteType,
        );
        this.texture.minFilter = THREE.NearestFilter;
        this.texture.magFilter = THREE.NearestFilter;
        this.texture.wrapS = THREE.ClampToEdgeWrapping;
        this.texture.wrapT = THREE.ClampToEdgeWrapping;
        // Rows are n bytes wide with n odd, so the default 4-byte row alignment would skew the upload.
        this.texture.unpackAlignment = 1;
        this.rebuild();
    }

    rebuild(): void {
        const o = this.options;
        const noise = createNoise2D(mulberry32(o.seed));
        const { size, segments } = this.heightmap;
        const step = size / segments;
        const half = size / 2;
        // Surface boundary sits halfway through the carve feather so the
        // flat track strip is fully on-track and the slope is verge.
        const trackEdge = this.track.width / 2 + this.track.feather / 2;
        const distance = this.track.distanceField;
        for (let j = 0; j < this.n; j++) {
            const z = j * step - half;
            for (let i = 0; i < this.n; i++) {
                const idx = i + j * this.n;
                if ((distance[idx] ?? Infinity) <= trackEdge) {
                    this.ids[idx] = o.track;
                    continue;
                }
                const x = i * step - half;
                const patch = noise(x * o.patchFrequency, z * o.patchFrequency) > o.patchThreshold;
                this.ids[idx] = patch ? o.patches : o.verge;
            }
        }
        this.texture.needsUpdate = true;
    }

    /** Surface id under a world position (nearest sample). */
    surfaceAt(x: number, z: number): number {
        const { size, segments } = this.heightmap;
        const i = Math.round((x / size + 0.5) * segments);
        const j = Math.round((z / size + 0.5) * segments);
        const ci = Math.max(0, Math.min(segments, i));
        const cj = Math.max(0, Math.min(segments, j));
        return this.ids[ci + cj * this.n] ?? 0;
    }
}
