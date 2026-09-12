import type { ExitFace } from './face';
import type { Vec2 } from './layout';
import { SIDE, add, scale } from './layout';
import type { TransitionSpan } from './path';
import { DEFAULT_TRANSITION, axisParameter, pathLength, transition, worldPath } from './path';
import { hermite } from './slope';
import { HEIGHT_UNIT } from './units';
import type { Heading, PlacedTile } from './placement';
import { cellToWorld } from './layout';
import { exitHeading } from './placement';
import type { Profile } from './profile';

/**
 * Les bords des zones d'une tuile, balayés le long de son axe.
 *
 * Le centre de la piste suit sa propre courbe : l'axe de la tuile, décalé latéralement du centre
 * du profil (qui change pendant la transition). Les largeurs de piste et de bas-côtés se mesurent
 * perpendiculairement à la tangente de cette courbe, et non à l'axe de la tuile : sinon une piste
 * qui se déplace en biais paraît plus étroite, d'un facteur cos(angle de biais).
 */

export interface Boundaries {
    /** Centre de la piste, sa direction de marche et la droite du conducteur. */
    readonly center: Vec2;
    readonly travel: Vec2;
    readonly right: Vec2;
    readonly blockLeft: Vec2;
    readonly roadLeft: Vec2;
    readonly roadRight: Vec2;
    readonly blockRight: Vec2;
}

export interface TileSweep {
    readonly center: Vec2;
    readonly heading: Heading;
    readonly exit: ExitFace;
    readonly entry: Profile;
    readonly exitProfile: Profile;
    /** Étendue de la transition de largeur, de position et de types ; celle de la spec par défaut. */
    readonly transition?: TransitionSpan;
    /** Pentes aux faces, en unités de hauteur par unité d'axe ; nulles par défaut (tuile isolée). */
    readonly entrySlope?: number;
    readonly exitSlope?: number;
}

const EPSILON = 1e-3;

/** Le balayage d'une tuile posée. */
export function tileSweep(placed: PlacedTile, transition?: TransitionSpan): TileSweep {
    return {
        center: cellToWorld(placed.cell),
        heading: placed.heading,
        exit: placed.tile.exit,
        entry: placed.entry,
        exitProfile: placed.tile.profile,
        entrySlope: placed.entrySlope,
        exitSlope: placed.exitSlope,
        ...(transition ? { transition } : {}),
    };
}

/** Direction absolue de la face de sortie d'une tuile posée. */
export function placedExitHeading(placed: PlacedTile): Heading {
    return exitHeading(placed.heading, placed.tile.exit);
}

export function boundariesAt(sweep: TileSweep, s: number): Boundaries {
    const center = roadCenter(sweep, s);
    // Différence centrée, en débordant de l'axe aux deux bouts : l'axe se prolonge naturellement et
    // la corde d'un arc centrée sur s a exactement la direction de la tangente.
    const before = roadCenter(sweep, s - EPSILON);
    const after = roadCenter(sweep, s + EPSILON);
    const travel = normalize({ x: after.x - before.x, y: after.y - before.y });
    const right = { x: travel.y, y: -travel.x };
    const t = transition(s, sweep.transition ?? DEFAULT_TRANSITION);
    const halfRoad = lerp(sweep.entry.roadWidth, sweep.exitProfile.roadWidth, t) / 2;
    const leftShoulder = lerp(sweep.entry.leftShoulder, sweep.exitProfile.leftShoulder, t);
    const rightShoulder = lerp(sweep.entry.rightShoulder, sweep.exitProfile.rightShoulder, t);
    return {
        center,
        travel,
        right,
        blockLeft: add(center, scale(right, -halfRoad - leftShoulder)),
        roadLeft: add(center, scale(right, -halfRoad)),
        roadRight: add(center, scale(right, halfRoad)),
        blockRight: add(center, scale(right, halfRoad + rightShoulder)),
    };
}

/** Le centre de la piste : l'axe de la tuile décalé du centre du profil courant. */
export function roadCenter(sweep: TileSweep, s: number): Vec2 {
    const sample = worldPath(sweep.center, sweep.heading, sweep.exit, s);
    const u = lerp(
        roadCenterUnit(sweep.entry),
        roadCenterUnit(sweep.exitProfile),
        transition(s, sweep.transition ?? DEFAULT_TRANSITION),
    );
    return add(sample.point, scale(sample.right, u - SIDE / 2));
}

function roadCenterUnit(profile: Profile): number {
    return profile.position + profile.roadWidth / 2;
}

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

function normalize(v: Vec2): Vec2 {
    const length = Math.hypot(v.x, v.y);
    return length === 0 ? { x: 0, y: 1 } : { x: v.x / length, y: v.y / length };
}

/**
 * Hauteur de l'axe à l'avancement `s` : cubique de Hermite entre les hauteurs des deux faces, avec
 * les pentes déduites des tuiles voisines (slope.ts). Pentes nulles = smoothstep, l'ancien
 * comportement. La hauteur ne dépend pas de l'étendue de transition, réservée à la largeur, à la
 * position et aux types.
 */
export function heightOfS(sweep: TileSweep, s: number): number {
    const length = pathLength(sweep.exit);
    const h = hermite(
        sweep.entry.height,
        (sweep.entrySlope ?? 0) * length,
        sweep.exitProfile.height,
        (sweep.exitSlope ?? 0) * length,
        Math.min(1, Math.max(0, s)),
    );
    return h * HEIGHT_UNIT;
}

/**
 * Hauteur du terrain en un point quelconque de la tuile : celle de l'axe au point le plus proche.
 * Sur une face, tous les points ont la hauteur du profil, donc deux tuiles voisines par la route se
 * raccordent exactement. Sert aux requêtes (une roue, un obstacle) ; le maillage, lui, prend la
 * hauteur de sa tranche.
 */
export function tileHeightAt(sweep: TileSweep, p: Vec2): number {
    return heightOfS(sweep, axisParameter(sweep.center, sweep.heading, sweep.exit, p));
}
