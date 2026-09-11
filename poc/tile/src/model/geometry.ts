import type { Vec2 } from './layout';
import { SIDE, add, entryFrame, facePoint, hexCorners, scale } from './layout';
import type { Zone } from './profile';
import type { Boundaries, TileSweep } from './sweep';
import { boundariesAt } from './sweep';
import { axisParameter, worldPath } from './path';
import { turnOf } from './face';

/**
 * Le découpage d'une tuile en polygones de zones, vu du dessus : trois bandes balayées (bas-côté
 * gauche, piste, bas-côté droit), coupées en deux au milieu de l'axe pour porter les types d'entrée
 * puis de sortie, et deux polygones de paysage entre le bloc et le contour de l'hexagone. C'est la
 * matière première du maillage 3D et de la carte 2D.
 */

export interface ZonePolygon {
    readonly zone: Zone;
    readonly side: 'left' | 'right' | 'center';
    /** Rang dans la palette de l'environnement (spec 2.2). */
    readonly type: number;
    readonly points: Vec2[];
}

export const DEFAULT_SAMPLES = 24;
/**
 * En épingle, le paysage intérieur se réduit à un secteur dont la pointe est le sommet commun aux
 * faces d'entrée et de sortie. Ce point appartient aux deux faces, à deux hauteurs différentes : on
 * remplace la pointe par un arc de ce rayon autour du sommet, invisible mais sans ambiguïté.
 */
export const APEX_RADIUS = 0.01;

export function tilePolygons(sweep: TileSweep, samples = DEFAULT_SAMPLES): ZonePolygon[] {
    const all = Array.from({ length: samples + 1 }, (_, i) => boundariesAt(sweep, i / samples));
    const half = Math.floor(samples / 2);
    const first = all.slice(0, half + 1);
    const second = all.slice(half);
    const { entry, exitProfile } = sweep;
    const polygons: ZonePolygon[] = [];

    const strip = (
        part: Boundaries[],
        left: keyof Boundaries,
        right: keyof Boundaries,
        zone: Zone,
        side: ZonePolygon['side'],
        type: number,
    ): void => {
        polygons.push({
            zone,
            side,
            type,
            points: [...part.map((b) => b[left]), ...part.map((b) => b[right]).reverse()],
        });
    };
    for (const [part, profile] of [
        [first, entry],
        [second, exitProfile],
    ] as const) {
        if (entry.leftShoulder + exitProfile.leftShoulder > 0) {
            strip(part, 'blockLeft', 'roadLeft', 'shoulder', 'left', profile.shoulder);
        }
        strip(part, 'roadLeft', 'roadRight', 'road', 'center', profile.road);
        if (entry.rightShoulder + exitProfile.rightShoulder > 0) {
            strip(part, 'roadRight', 'blockRight', 'shoulder', 'right', profile.shoulder);
        }
    }

    // Le paysage : des bandes entre le bord du bloc et le contour de l'hexagone, une par intervalle
    // d'échantillons. La hauteur ne dépend que de l'avancement s, et la ligne latérale d'un s (la
    // perpendiculaire à l'axe, ou le rayon de l'arc) est une ligne d'égale hauteur : découper ainsi
    // évite les grands triangles vrillés entre deux avancements éloignés.
    const values = landscapeSamples(sweep, samples);
    const left = values.map((v) => ({
        inner: boundariesAt(sweep, v).blockLeft,
        outer: outerPoint(sweep, v, -1),
    }));
    const right = values.map((v) => ({
        inner: boundariesAt(sweep, v).blockRight,
        outer: outerPoint(sweep, v, 1),
    }));
    for (let i = 0; i + 1 < values.length; i++) {
        const [l0, l1, r0, r1] = [left[i], left[i + 1], right[i], right[i + 1]];
        if (!l0 || !l1 || !r0 || !r1) continue;
        polygons.push({
            zone: 'landscape',
            side: 'left',
            type: entry.landscape,
            points: [l0.inner, l1.inner, l1.outer, l0.outer],
        });
        polygons.push({
            zone: 'landscape',
            side: 'right',
            type: entry.landscape,
            points: [r0.outer, r1.outer, r1.inner, r0.inner],
        });
    }
    return polygons;
}

/** Aire signée d'un polygone (formule du lacet), positive dans le sens trigonométrique. */
export function polygonArea(points: Vec2[]): number {
    let sum = 0;
    for (let i = 0; i < points.length; i++) {
        const a = points[i];
        const b = points[(i + 1) % points.length];
        if (a && b) sum += a.x * b.y - b.x * a.y;
    }
    return sum / 2;
}

export const HEX_AREA = ((3 * Math.sqrt(3)) / 2) * SIDE * SIDE;

/**
 * Les avancements auxquels on découpe le paysage : les échantillons réguliers plus l'avancement de
 * chaque sommet de l'hexagone, pour que les bandes épousent exactement le contour.
 */
function landscapeSamples(sweep: TileSweep, samples: number): number[] {
    const values = Array.from({ length: samples + 1 }, (_, i) => i / samples);
    for (const corner of hexCorners(sweep.center)) {
        const s = axisParameter(sweep.center, sweep.heading, sweep.exit, corner);
        if (s > 1e-6 && s < 1 - 1e-6) values.push(s);
    }
    return [...new Set(values)].sort((a, b) => a - b);
}

/**
 * Le point du contour de l'hexagone atteint par la ligne latérale de l'avancement `s`, du côté
 * `side` (-1 à gauche du conducteur, +1 à droite). En épingle, la ligne du côté intérieur aboutit
 * au sommet commun aux deux faces, dont la hauteur est ambiguë : on s'arrête à APEX_RADIUS.
 */
function outerPoint(sweep: TileSweep, s: number, side: -1 | 1): Vec2 {
    const axis = worldPath(sweep.center, sweep.heading, sweep.exit, s);
    const direction = scale(axis.right, side);
    const corners = hexCorners(sweep.center);
    let tExit = Infinity;
    for (let i = 0; i < corners.length; i++) {
        const a = corners[i];
        const b = corners[(i + 1) % corners.length];
        if (!a || !b) continue;
        // Contour horaire : la normale intérieure d'une arête est à sa droite.
        const normal = { x: b.y - a.y, y: -(b.x - a.x) };
        const denominator = direction.x * normal.x + direction.y * normal.y;
        if (denominator > -1e-9) continue;
        const t = ((a.x - axis.point.x) * normal.x + (a.y - axis.point.y) * normal.y) / denominator;
        if (t < tExit) tExit = t;
    }
    const pivot = sharpPivot(sweep);
    const hit = add(axis.point, scale(direction, tExit));
    if (pivot && Math.hypot(hit.x - pivot.x, hit.y - pivot.y) < 1e-6) {
        return add(axis.point, scale(direction, tExit - APEX_RADIUS));
    }
    return hit;
}

/** Le sommet commun aux faces d'entrée et de sortie d'une épingle, sinon null. */
function sharpPivot(sweep: TileSweep): Vec2 | null {
    const turn = turnOf(sweep.exit);
    if (Math.abs(turn) !== 2) return null;
    return facePoint(entryFrame(sweep.center, sweep.heading), turn > 0 ? SIDE : 0);
}

/**
 * Le contour d'une tuile dans l'ordre, avec les mêmes points que les bandes de paysage : chaîne
 * extérieure gauche de l'entrée à la sortie, puis chaîne droite de la sortie à l'entrée. Les faces
 * d'entrée et de sortie sont les segments qui ferment la boucle. Sert aux jupes.
 */
export function tileBoundary(sweep: TileSweep, samples = DEFAULT_SAMPLES): Vec2[] {
    const values = landscapeSamples(sweep, samples);
    return [
        ...values.map((v) => outerPoint(sweep, v, -1)),
        ...values.map((v) => outerPoint(sweep, v, 1)).reverse(),
    ];
}
