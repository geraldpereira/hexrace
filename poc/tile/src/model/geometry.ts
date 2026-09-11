import type { Vec2 } from './layout';
import { SIDE, entryFrame, exitFrame, facePoint, hexCorners } from './layout';
import type { Zone } from './profile';
import type { Boundaries, TileSweep } from './sweep';
import { boundariesAt } from './sweep';
import { exitHeading } from './placement';

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

    const corners = hexCorners(sweep.center);
    const out = exitHeading(sweep.heading, sweep.exit);
    const inn = entryFrame(sweep.center, sweep.heading);
    const ex = exitFrame(sweep.center, out);
    const entryLeft = nearestCorner(corners, facePoint(inn, 0));
    const entryRight = nearestCorner(corners, facePoint(inn, SIDE));
    const exitLeft = nearestCorner(corners, facePoint(ex, 0));
    const exitRight = nearestCorner(corners, facePoint(ex, SIDE));

    polygons.push({
        zone: 'landscape',
        side: 'left',
        type: entry.landscape,
        points: [...all.map((b) => b.blockLeft), ...walk(corners, exitLeft, entryLeft, -1)],
    });
    polygons.push({
        zone: 'landscape',
        side: 'right',
        type: entry.landscape,
        points: [
            ...all.map((b) => b.blockRight).reverse(),
            ...walk(corners, entryRight, exitRight, -1),
        ],
    });
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

function nearestCorner(corners: Vec2[], p: Vec2): number {
    let best = 0;
    let bestDistance = Infinity;
    corners.forEach((c, i) => {
        const d = Math.hypot(c.x - p.x, c.y - p.y);
        if (d < bestDistance) {
            bestDistance = d;
            best = i;
        }
    });
    return best;
}

/** Les sommets de `from` à `to` inclus, en avançant de `step` (+1 sens horaire, -1 sens inverse). */
function walk(corners: Vec2[], from: number, to: number, step: 1 | -1): Vec2[] {
    const result: Vec2[] = [];
    let i = from;
    for (let guard = 0; guard < 7; guard++) {
        const c = corners[i];
        if (c) result.push(c);
        if (i === to) break;
        i = (i + step + 6) % 6;
    }
    return result;
}
