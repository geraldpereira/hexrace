import type { Vec2 } from './layout';
import type { SPoint } from './geometry';
import { SIDE, add, hexCorners, scale } from './layout';
import type { RoadType } from './profile';
import type { Placement } from './placement';
import type { TileSweep } from './sweep';
import { boundariesAt, tileSweep } from './sweep';

/**
 * Les obstacles d'une tuile (spec 2.4), posés par rapport à la piste et non à la face :
 *
 * - longitudinalement, une **fraction de l'axe** de la tuile, 0 à l'entrée, 1 à la sortie. Une
 *   barrière tout le long est toujours `0 → 1`, quelle que soit la longueur de l'axe ;
 * - latéralement, un **décalage en unités depuis le centre de la piste**, négatif à gauche, qui
 *   suit la piste quand elle se déplace dans la tuile.
 *
 * Deux familles : les **hazards**, objets rigides de taille fixe orientés selon la tangente de la
 * piste, dont l'environnement décide l'aspect (balle de foin, rocher, épave) ; les **objets
 * suivis**, bandes qui épousent la courbe entre deux fractions.
 */

export type HazardSize = 'small' | 'medium' | 'large';

/** Emprise d'un hazard en unités : longueur le long de la piste, largeur en travers. */
export const HAZARD_FOOTPRINT: Record<HazardSize, { length: number; width: number }> = {
    small: { length: 1, width: 1 },
    medium: { length: 2, width: 1 },
    large: { length: 2, width: 2 },
};

export interface Hazard {
    readonly kind: 'hazard';
    readonly size: HazardSize;
    readonly at: number;
    readonly offset: number;
}

/** Sur le bord de la piste du côté choisi, à la place du bas-côté (emprise d'une unité). */
export interface Barrier {
    readonly kind: 'barrier';
    readonly side: 'left' | 'right';
    readonly from: number;
    readonly to: number;
}

/** Sur toute la largeur de la piste. */
export interface RoadBand {
    readonly kind: 'ramp' | 'bump';
    readonly from: number;
    readonly to: number;
}

/** Une zone d'un autre revêtement sur la piste, sans collision. */
export interface Patch {
    readonly kind: 'patch';
    readonly from: number;
    readonly to: number;
    readonly offset: number;
    readonly width: number;
    readonly road: RoadType;
}

export type Obstacle = Hazard | Barrier | RoadBand | Patch;

/** Ce qu'une barrière occupe dans les données, et l'épaisseur de son modèle, en unités. */
export const BARRIER_FOOTPRINT_WIDTH = 1;
export const BARRIER_BODY_WIDTH = 0.3;

const BAND_SAMPLES = 12;

export interface Footprint {
    readonly obstacle: Obstacle;
    /** Ce que l'obstacle réserve dans les données de la tuile ; chaque point connaît son avancement. */
    readonly outline: SPoint[];
    /** Ce qu'on voit et qu'on touche ; identique à l'emprise sauf pour la barrière. */
    readonly body: SPoint[];
}

export function obstacleFootprint(sweep: TileSweep, obstacle: Obstacle): Footprint {
    switch (obstacle.kind) {
        case 'hazard': {
            const { length, width } = HAZARD_FOOTPRINT[obstacle.size];
            const b = boundariesAt(sweep, obstacle.at);
            const center = add(b.center, scale(b.right, obstacle.offset));
            const along = scale(b.travel, length / 2);
            const across = scale(b.right, width / 2);
            // Un objet rigide est de niveau : tous ses coins à la hauteur de son centre.
            const outline = [
                add(add(center, along), across),
                add(add(center, along), scale(across, -1)),
                add(add(center, scale(along, -1)), scale(across, -1)),
                add(add(center, scale(along, -1)), across),
            ].map((p) => ({ ...p, s: obstacle.at }));
            return { obstacle, outline, body: outline };
        }
        case 'barrier': {
            const out = obstacle.side === 'left' ? -1 : 1;
            const edge = obstacle.side === 'left' ? 'roadLeft' : 'roadRight';
            const outline = band(sweep, obstacle.from, obstacle.to, (b) => [
                b[edge],
                add(b[edge], scale(b.right, out * BARRIER_FOOTPRINT_WIDTH)),
            ]);
            const body = band(sweep, obstacle.from, obstacle.to, (b) => [
                add(b[edge], scale(b.right, out * (BARRIER_FOOTPRINT_WIDTH - BARRIER_BODY_WIDTH))),
                add(b[edge], scale(b.right, out * BARRIER_FOOTPRINT_WIDTH)),
            ]);
            return { obstacle, outline, body };
        }
        case 'ramp':
        case 'bump': {
            const outline = band(sweep, obstacle.from, obstacle.to, (b) => [
                b.roadLeft,
                b.roadRight,
            ]);
            return { obstacle, outline, body: outline };
        }
        case 'patch': {
            const outline = band(sweep, obstacle.from, obstacle.to, (b) => [
                add(b.center, scale(b.right, obstacle.offset - obstacle.width / 2)),
                add(b.center, scale(b.right, obstacle.offset + obstacle.width / 2)),
            ]);
            return { obstacle, outline, body: outline };
        }
    }
}

/** Une bande entre deux bords qui suivent la piste, de `from` à `to`. */
function band(
    sweep: TileSweep,
    from: number,
    to: number,
    edges: (b: ReturnType<typeof boundariesAt>) => [Vec2, Vec2],
): SPoint[] {
    const left: SPoint[] = [];
    const right: SPoint[] = [];
    for (let i = 0; i <= BAND_SAMPLES; i++) {
        const s = from + ((to - from) * i) / BAND_SAMPLES;
        const [l, r] = edges(boundariesAt(sweep, s));
        left.push({ ...l, s });
        right.push({ ...r, s });
    }
    return [...left, ...right.reverse()];
}

/** Ce qui ne va pas dans un obstacle, en clair : fractions hors de la tuile, emprise qui déborde de l'hexagone. */
export function obstacleErrors(sweep: TileSweep, obstacle: Obstacle): string[] {
    const errors: string[] = [];
    const name = describe(obstacle);
    if (obstacle.kind === 'hazard') {
        if (!inUnit(obstacle.at)) errors.push(`${name} : position ${obstacle.at} hors de 0 à 1`);
    } else {
        if (!inUnit(obstacle.from) || !inUnit(obstacle.to)) {
            errors.push(`${name} : intervalle ${obstacle.from} à ${obstacle.to} hors de 0 à 1`);
        } else if (obstacle.from >= obstacle.to) {
            errors.push(`${name} : intervalle ${obstacle.from} à ${obstacle.to} vide`);
        }
    }
    if (errors.length > 0) return errors;
    const corners = hexCorners(sweep.center);
    const { outline } = obstacleFootprint(sweep, obstacle);
    if (outline.some((p) => !insideConvex(p, corners)))
        errors.push(`${name} : déborde de la tuile`);
    return errors;
}

export function describe(obstacle: Obstacle): string {
    switch (obstacle.kind) {
        case 'hazard':
            return `hazard ${obstacle.size} à ${obstacle.at}`;
        case 'barrier':
            return `barrière ${obstacle.side === 'left' ? 'gauche' : 'droite'}`;
        default:
            return obstacle.kind;
    }
}

function inUnit(value: number): boolean {
    return value >= 0 && value <= 1;
}

/** Point dans un polygone convexe donné dans le sens horaire, avec une petite tolérance. */
function insideConvex(p: Vec2, polygon: Vec2[]): boolean {
    const tolerance = SIDE * 1e-6;
    for (let i = 0; i < polygon.length; i++) {
        const a = polygon[i];
        const b = polygon[(i + 1) % polygon.length];
        if (!a || !b) return false;
        const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
        if (cross > tolerance) return false;
    }
    return true;
}

/** Les erreurs d'obstacles de toute une piste posée, préfixées du numéro de tuile. */
export function placedObstacleErrors(placement: Placement): string[] {
    const errors: string[] = [];
    for (const placed of placement.tiles) {
        const sweep = tileSweep(placed);
        for (const obstacle of placed.tile.obstacles ?? []) {
            for (const error of obstacleErrors(sweep, obstacle)) {
                errors.push(`tuile ${placed.index} : ${error}`);
            }
        }
    }
    return errors;
}
