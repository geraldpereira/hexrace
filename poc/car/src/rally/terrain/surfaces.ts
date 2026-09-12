import type { CurvePoint } from '../../engine/debug/curveEditor';

/**
 * One road surface. Friction curves are effective μ (what the tyre actually
 * gets); CarBehavior squares them before handing them to Jolt because the
 * ground body friction is 1 and Jolt combines as sqrt(tyre * ground).
 */
export interface Surface {
    readonly name: string;
    readonly color: number;
    longitudinal: CurvePoint[];
    lateral: CurvePoint[];
    /** Wheel spin damping — stands in for rolling resistance. */
    rollingDamping: number;
    /** Horizontal drag on the chassis per wheel in contact, in N per m/s. */
    drag: number;
    /**
     * Height of the virtual bumps under each wheel, in metres (noise
     * amplitude). Fed to the suspension as a preload and to the wheel mesh
     * as an offset, so the wheel visibly rides over ground that isn't in
     * the heightmap and the chassis reacts through the spring.
     */
    bumpHeight: number;
    /**
     * Sideways force noise at each wheel (perpendicular to its rolling
     * direction), as a fraction of its static load at the reference speed.
     * Ruts and stones tugging the car.
     */
    lateralRoughness: number;
    /** Distance between two grain bumps, in metres. Short = vibration, long = ruts. */
    wavelength: number;
    /** Skid mark colour: rubber on asphalt, a rut in the loose stuff. */
    markColor: number;
    /** Skid mark opacity at full slip. */
    markOpacity: number;
    /** What a sliding tyre sounds like here (see `tyreProcessor.ts`). */
    slideSound: SlideSound;
    /** What rolling over it sounds like (see `chassisProcessor.ts`). */
    rollSound: RollSound;
}

export interface RollSound {
    /** Broadband tyre roar level and its low-pass cutoff (Hz). */
    hiss: number;
    hissFreq: number;
    /** Stones and clods: grains per second at full speed, their length (s) and level. */
    grainRate: number;
    grainDur: number;
    grainLevel: number;
    /** Low rumble level. */
    rumble: number;
}

export interface SlideSound {
    /** 0 = grainy crunch (loose stuff), 1 = tonal squeal (asphalt). Mixes in between. */
    tone: number;
    /** Squeal centre frequency, or the crunch low-pass cutoff (Hz). */
    freq: number;
    /** Squeal resonance. */
    q: number;
    /** Grains per second at full slide, 0 for none. */
    grainRate: number;
    /** Grain length (s): short = gravel tick, long = mud blub. */
    grainDur: number;
    level: number;
}

export const SURFACE_ASPHALT = 0;
export const SURFACE_GRAVEL = 1;
export const SURFACE_DIRT = 2;
export const SURFACE_MUD = 3;

export const SURFACES: readonly Surface[] = [
    {
        name: 'Asphalt',
        color: 0x4a4a50,
        // High peak with a gentle fall-off past it: grippy but forgiving,
        // the tyre gives up gradually instead of snapping loose.
        longitudinal: [
            { x: 0, y: 0 },
            { x: 0.08, y: 1.5 },
            { x: 0.3, y: 1.4 },
            { x: 1, y: 1.25 },
        ],
        lateral: [
            { x: 0, y: 0 },
            { x: 4, y: 1.5 },
            { x: 12, y: 1.4 },
            { x: 30, y: 1.25 },
        ],
        rollingDamping: 0.2,
        drag: 0,
        bumpHeight: 0,
        lateralRoughness: 0,
        wavelength: 0.5,
        markColor: 0x111111,
        markOpacity: 0.75,
        slideSound: { tone: 1, freq: 1000, q: 14, grainRate: 0, grainDur: 0.004, level: 1.8 },
        rollSound: {
            hiss: 0.5,
            hissFreq: 1800,
            grainRate: 0,
            grainDur: 0.003,
            grainLevel: 0,
            rumble: 0.15,
        },
    },
    {
        name: 'Gravel',
        color: 0x9a8a6a,
        longitudinal: [
            { x: 0, y: 0 },
            { x: 0.12, y: 1.05 },
            { x: 0.5, y: 1.0 },
            { x: 1, y: 0.95 },
        ],
        lateral: [
            { x: 0, y: 0 },
            { x: 6, y: 1.0 },
            { x: 20, y: 0.95 },
            { x: 30, y: 0.9 },
        ],
        rollingDamping: 0.5,
        drag: 5,
        bumpHeight: 0.02,
        lateralRoughness: 0.2,
        wavelength: 0.3,
        markColor: 0x2f2924,
        markOpacity: 0.45,
        slideSound: { tone: 0.05, freq: 2400, q: 1, grainRate: 900, grainDur: 0.004, level: 0.9 },
        rollSound: {
            hiss: 0.15,
            hissFreq: 2500,
            grainRate: 400,
            grainDur: 0.003,
            grainLevel: 0.9,
            rumble: 0.5,
        },
    },
    {
        name: 'Dirt',
        color: 0x6b4a2a,
        longitudinal: [
            { x: 0, y: 0 },
            { x: 0.15, y: 0.9 },
            { x: 0.5, y: 0.85 },
            { x: 1, y: 0.8 },
        ],
        lateral: [
            { x: 0, y: 0 },
            { x: 8, y: 0.85 },
            { x: 20, y: 0.8 },
            { x: 30, y: 0.75 },
        ],
        rollingDamping: 0.8,
        drag: 15,
        bumpHeight: 0.05,
        lateralRoughness: 0.35,
        wavelength: 1.5,
        markColor: 0x231a10,
        markOpacity: 0.5,
        slideSound: { tone: 0.1, freq: 1200, q: 1, grainRate: 350, grainDur: 0.008, level: 1 },
        rollSound: {
            hiss: 0.2,
            hissFreq: 1200,
            grainRate: 120,
            grainDur: 0.006,
            grainLevel: 0.5,
            rumble: 0.6,
        },
    },
    {
        name: 'Mud',
        color: 0x3e2f1e,
        // Sticky: little grip, and heavy drag + wheel damping so the car
        // bogs down within a few metres once it leaves the throttle.
        longitudinal: [
            { x: 0, y: 0 },
            { x: 0.2, y: 0.5 },
            { x: 0.5, y: 0.45 },
            { x: 1, y: 0.4 },
        ],
        lateral: [
            { x: 0, y: 0 },
            { x: 10, y: 0.5 },
            { x: 30, y: 0.4 },
        ],
        rollingDamping: 6.0,
        drag: 250,
        bumpHeight: 0.03,
        lateralRoughness: 0.15,
        wavelength: 3,
        markColor: 0x120d08,
        markOpacity: 0.55,
        slideSound: { tone: 0, freq: 350, q: 1, grainRate: 25, grainDur: 0.03, level: 1.3 },
        rollSound: {
            hiss: 0.1,
            hissFreq: 500,
            grainRate: 30,
            grainDur: 0.02,
            grainLevel: 0.6,
            rumble: 0.7,
        },
    },
];

export const SURFACE_NAMES: Record<string, number> = Object.fromEntries(
    SURFACES.map((s, i) => [s.name, i]),
);
