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
    /** Vertical force noise at each wheel, as a fraction of its static load at the reference speed. */
    roughness: number;
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
        roughness: 0,
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
        roughness: 0.35,
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
        roughness: 0.6,
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
        roughness: 0.15,
    },
];

export const SURFACE_NAMES: Record<string, number> = Object.fromEntries(
    SURFACES.map((s, i) => [s.name, i]),
);
