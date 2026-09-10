import * as THREE from 'three';

/**
 * Returns a Mulberry32 PRNG seeded with the given value, as a `() => number`
 * yielding uniform floats in [0, 1). Each call produces an isolated stream —
 * unlike `THREE.MathUtils.seededRandom`, which shares a single global state.
 */
export function mulberry32(seed: number): () => number {
    let s = seed;
    return () => {
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Smoothstep blend between two output values, driven by an input clamped to
 * `[lowEdge, highEdge]`. Below `lowEdge`: returns `lowOut`. Above `highEdge`:
 * returns `highOut`. In between: cubic ease (3t² − 2t³).
 */
export function smoothBlend(
    value: number,
    lowEdge: number,
    highEdge: number,
    lowOut: number,
    highOut: number,
): number {
    return THREE.MathUtils.lerp(
        lowOut,
        highOut,
        THREE.MathUtils.smoothstep(value, lowEdge, highEdge),
    );
}
