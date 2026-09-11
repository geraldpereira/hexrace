import type { Profile } from './profile';
import { FACE_WIDTH, blockEnd, blockStart } from './profile';
import type { Cell, Heading } from './placement';

/**
 * Passage de la grille aux coordonnées du monde, en unités (une unité = une largeur de voiture).
 * Plan 2D vu du dessus, x vers l'est, y vers le nord ; la 3D posera y sur -z.
 */

export interface Vec2 {
    readonly x: number;
    readonly y: number;
}

/** Côté d'un hexagone, en unités (spec 2.1). */
export const SIDE = FACE_WIDTH;
/** Distance du centre au milieu d'une face. */
export const APOTHEM = (SIDE * Math.sqrt(3)) / 2;
/** Distance entre les centres de deux tuiles voisines. */
export const PITCH = 2 * APOTHEM;

export function add(a: Vec2, b: Vec2): Vec2 {
    return { x: a.x + b.x, y: a.y + b.y };
}

export function scale(v: Vec2, k: number): Vec2 {
    return { x: v.x * k, y: v.y * k };
}

/** Vecteur unitaire d'une direction absolue : rang 0 = nord, puis sens horaire par pas de 60°. */
export function directionVector(heading: Heading): Vec2 {
    const angle = Math.PI / 2 - (heading * Math.PI) / 3;
    return { x: Math.cos(angle), y: Math.sin(angle) };
}

export function cellToWorld(cell: Cell): Vec2 {
    // Disposition « flat » : q avance de 1,5 côté vers l'est, r d'un pas vers le nord.
    return {
        x: SIDE * 1.5 * cell.q,
        y: APOTHEM * cell.q + PITCH * cell.r,
    };
}

/** Les six sommets d'une tuile centrée en `center`, en partant du sommet nord-est, sens horaire. */
export function hexCorners(center: Vec2): Vec2[] {
    return Array.from({ length: 6 }, (_, i) => {
        const angle = Math.PI / 3 - (i * Math.PI) / 3;
        return add(center, { x: SIDE * Math.cos(angle), y: SIDE * Math.sin(angle) });
    });
}

/**
 * Une face vue par le conducteur qui la traverse : `travel` sa direction de marche, `right` sa
 * droite, `origin` le coin gauche de la face. L'unité u de la face va de `origin + right·u` à
 * `origin + right·(u+1)`.
 */
export interface FaceFrame {
    readonly origin: Vec2;
    readonly travel: Vec2;
    readonly right: Vec2;
}

/** La face d'entrée (6) d'une tuile orientée `heading` : on la traverse vers l'intérieur. */
export function entryFrame(center: Vec2, heading: Heading): FaceFrame {
    const travel = directionVector(heading);
    const right = rightOf(travel);
    const middle = add(center, scale(travel, -APOTHEM));
    return { origin: add(middle, scale(right, -SIDE / 2)), travel, right };
}

/** La face de sortie d'une tuile, de direction absolue `exitHeading` : on la traverse vers l'extérieur. */
export function exitFrame(center: Vec2, exitHeading: Heading): FaceFrame {
    const travel = directionVector(exitHeading);
    const right = rightOf(travel);
    const middle = add(center, scale(travel, APOTHEM));
    return { origin: add(middle, scale(right, -SIDE / 2)), travel, right };
}

function rightOf(travel: Vec2): Vec2 {
    return { x: travel.y, y: -travel.x };
}

/** Point de la face à l'unité `u` (fractionnaire), poussé de `depth` dans le sens de la marche. */
export function facePoint(frame: FaceFrame, u: number, depth = 0): Vec2 {
    return add(add(frame.origin, scale(frame.right, u)), scale(frame.travel, depth));
}

/** Bornes gauche et droite, en unités depuis la gauche de la face, d'une zone du profil. */
export function roadSpan(profile: Profile): [number, number] {
    return [profile.position, profile.position + profile.roadWidth];
}

export function blockSpan(profile: Profile): [number, number] {
    return [blockStart(profile), blockEnd(profile)];
}
