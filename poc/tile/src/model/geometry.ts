import type { ExitFace } from './face';
import { turnOf } from './face';
import type { Vec2 } from './layout';
import { SIDE, add, entryFrame, facePoint, hexCorners, scale } from './layout';
import { axisParameter, worldPath } from './path';
import type { Zone } from './profile';
import type { TileSweep } from './sweep';
import { boundariesAt, heightOfS } from './sweep';

/**
 * Le découpage d'une tuile en **tranches** : à chaque avancement `s`, la ligne latérale (la
 * perpendiculaire à l'axe, ou le rayon de l'arc en virage) coupe, de gauche à droite, le contour de
 * l'hexagone, le bord du bloc, les deux bords de la piste, le bord du bloc et le contour. Deux
 * tranches voisines donnent cinq quadrilatères : paysage, bas-côté, piste, bas-côté, paysage.
 *
 * La hauteur ne dépend que de `s` : tous les points d'une tranche sont à la même hauteur, celle de
 * l'axe en `s`, y compris les bords de la piste qui, pendant une transition, s'écartent un peu de la
 * ligne latérale. Le profil reste ainsi de niveau en travers, et les quadrilatères ne relient jamais
 * que deux tranches voisines.
 */

/** Un point du plan qui connaît son avancement le long de l'axe, donc sa hauteur. */
export interface SPoint extends Vec2 {
    readonly s: number;
}

export interface Slice {
    readonly s: number;
    readonly outerLeft: SPoint;
    readonly blockLeft: SPoint;
    readonly roadLeft: SPoint;
    readonly roadRight: SPoint;
    readonly blockRight: SPoint;
    readonly outerRight: SPoint;
}

export interface ZoneQuad {
    readonly zone: Zone;
    readonly side: 'left' | 'right' | 'center';
    /** Rang dans la palette de l'environnement (spec 2.2). */
    readonly type: number;
    /** Quatre points, dans le sens trigonométrique vu du dessus. */
    readonly points: SPoint[];
}

export interface ZonePolygon {
    readonly zone: Zone;
    readonly side: 'left' | 'right' | 'center';
    readonly type: number;
    readonly points: SPoint[];
}

export const DEFAULT_SAMPLES = 24;

/**
 * Tranches par tuile selon la sortie : une épingle tourne de 120° sur un axe court, il en faut plus
 * pour que les bords restent ronds et que les quadrilatères vrillés par une pente ne fassent pas
 * de paliers visibles en flat shading.
 */
export function samplesFor(exit: ExitFace): number {
    const turn = Math.abs(turnOf(exit));
    return turn === 0 ? DEFAULT_SAMPLES : turn === 1 ? 36 : 48;
}
/**
 * En épingle, le paysage intérieur se réduit à un secteur dont la pointe est le sommet commun aux
 * faces d'entrée et de sortie. Ce point appartient aux deux faces, à deux hauteurs différentes : on
 * s'arrête à ce rayon du sommet, invisible mais sans ambiguïté.
 */
export const APEX_RADIUS = 0.01;

export function tileSlices(sweep: TileSweep, samples = samplesFor(sweep.exit)): Slice[] {
    return sliceParameters(sweep, samples).map((s) => {
        const b = boundariesAt(sweep, s);
        const at = (p: Vec2): SPoint => ({ x: p.x, y: p.y, s });
        return {
            s,
            outerLeft: at(outerPoint(sweep, s, -1)),
            blockLeft: at(b.blockLeft),
            roadLeft: at(b.roadLeft),
            roadRight: at(b.roadRight),
            blockRight: at(b.blockRight),
            outerRight: at(outerPoint(sweep, s, 1)),
        };
    });
}

/** Les quadrilatères d'une tuile, un par zone et par intervalle de tranches. */
export function tileQuads(sweep: TileSweep, samples = samplesFor(sweep.exit)): ZoneQuad[] {
    const slices = tileSlices(sweep, samples);
    const { entry, exitProfile } = sweep;
    const quads: ZoneQuad[] = [];
    for (let i = 0; i + 1 < slices.length; i++) {
        const a = slices[i];
        const b = slices[i + 1];
        if (!a || !b) continue;
        const profile = (a.s + b.s) / 2 < 0.5 ? entry : exitProfile;
        const quad = (
            zone: Zone,
            side: ZoneQuad['side'],
            type: number,
            left: keyof Slice,
            right: keyof Slice,
        ): void => {
            const points = [a[left], b[left], b[right], a[right]] as SPoint[];
            quads.push({ zone, side, type, points });
        };
        quad('landscape', 'left', entry.landscape, 'outerLeft', 'blockLeft');
        if (entry.leftShoulder + exitProfile.leftShoulder > 0) {
            quad('shoulder', 'left', profile.shoulder, 'blockLeft', 'roadLeft');
        }
        quad('road', 'center', profile.road, 'roadLeft', 'roadRight');
        if (entry.rightShoulder + exitProfile.rightShoulder > 0) {
            quad('shoulder', 'right', profile.shoulder, 'roadRight', 'blockRight');
        }
        quad('landscape', 'right', entry.landscape, 'blockRight', 'outerRight');
    }
    return quads;
}

/**
 * Les mêmes zones fusionnées en polygones le long de l'axe, pour la carte 2D : bord gauche à
 * l'aller, bord droit au retour. Piste et bas-côtés sont coupés au milieu pour porter les types
 * d'entrée puis de sortie.
 */
export function tilePolygons(sweep: TileSweep, samples = samplesFor(sweep.exit)): ZonePolygon[] {
    const slices = tileSlices(sweep, samples);
    const { entry, exitProfile } = sweep;
    const polygons: ZonePolygon[] = [];
    const merge = (
        part: Slice[],
        zone: Zone,
        side: ZonePolygon['side'],
        type: number,
        left: keyof Slice,
        right: keyof Slice,
    ): void => {
        const points = [
            ...part.map((sl) => sl[left] as SPoint),
            ...part.map((sl) => sl[right] as SPoint).reverse(),
        ];
        polygons.push({ zone, side, type, points });
    };
    merge(slices, 'landscape', 'left', entry.landscape, 'outerLeft', 'blockLeft');
    merge(slices, 'landscape', 'right', entry.landscape, 'blockRight', 'outerRight');
    const mid = slices.findIndex((sl) => sl.s >= 0.5);
    const halves: [Slice[], typeof entry][] = [
        [slices.slice(0, mid + 1), entry],
        [slices.slice(mid), exitProfile],
    ];
    for (const [part, profile] of halves) {
        if (entry.leftShoulder + exitProfile.leftShoulder > 0) {
            merge(part, 'shoulder', 'left', profile.shoulder, 'blockLeft', 'roadLeft');
        }
        merge(part, 'road', 'center', profile.road, 'roadLeft', 'roadRight');
        if (entry.rightShoulder + exitProfile.rightShoulder > 0) {
            merge(part, 'shoulder', 'right', profile.shoulder, 'roadRight', 'blockRight');
        }
    }
    return polygons;
}

/**
 * Le contour d'une tuile dans l'ordre, avec les mêmes points que les tranches : chaîne extérieure
 * gauche de l'entrée à la sortie, puis chaîne droite de la sortie à l'entrée. Sert aux jupes.
 */
export function tileBoundary(sweep: TileSweep, samples = samplesFor(sweep.exit)): SPoint[] {
    const slices = tileSlices(sweep, samples);
    return [...slices.map((sl) => sl.outerLeft), ...slices.map((sl) => sl.outerRight).reverse()];
}

/** Hauteur d'un point de tranche, en unités du monde. */
export function heightOf(sweep: TileSweep, p: SPoint): number {
    return heightOfS(sweep, p.s);
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
 * Les avancements des tranches : les échantillons réguliers, le milieu, plus l'avancement de
 * chaque sommet de l'hexagone pour que les tranches épousent exactement le contour.
 */
function sliceParameters(sweep: TileSweep, samples: number): number[] {
    const values = Array.from({ length: samples + 1 }, (_, i) => i / samples);
    values.push(0.5);
    for (const corner of hexCorners(sweep.center)) {
        const s = axisParameter(sweep.center, sweep.heading, sweep.exit, corner);
        if (s > 1e-6 && s < 1 - 1e-6) values.push(s);
    }
    return [...new Set(values.map((v) => Math.round(v * 1e9) / 1e9))].sort((a, b) => a - b);
}

/**
 * Le point du contour de l'hexagone atteint par la ligne latérale de l'avancement `s`, du côté
 * `side` (-1 à gauche du conducteur, +1 à droite). En épingle, la ligne du côté intérieur aboutit
 * au sommet commun aux deux faces : on s'arrête à APEX_RADIUS.
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
