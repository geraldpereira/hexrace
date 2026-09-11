import type { ExitFace } from './face';
import { turnOf } from './face';
import type { Vec2 } from './layout';
import { APOTHEM, SIDE, add, scale } from './layout';
import type { Heading } from './placement';

/**
 * L'axe d'une tuile : la courbe que suit le milieu de la face d'entrée jusqu'au milieu de la face
 * de sortie, tangente aux deux faces. Le profil est balayé le long de cet axe, le paramètre `s`
 * allant de 0 (entrée) à 1 (sortie).
 *
 * - Tout droit : un segment de deux apothèmes.
 * - Virage à 60° : un arc de rayon 1,5 côté (12 unités), centré sur le centre de la tuile voisine
 *   qui touche à la fois la face d'entrée et la face de sortie.
 * - Virage à 120° : un arc de rayon un demi-côté (4 unités), centré sur le sommet commun aux deux
 *   faces. Le bord intérieur du profil (unité 8 ou 0 selon le sens) se réduit à ce sommet.
 *
 * Tout est exprimé dans le repère local d'une tuile centrée à l'origine et orientée au nord ;
 * `worldPath` la tourne et la déplace.
 */

export interface PathSample {
    readonly point: Vec2;
    /** Direction de marche, unitaire. */
    readonly travel: Vec2;
    /** Droite du conducteur, unitaire. */
    readonly right: Vec2;
}

export const WIDE_TURN_RADIUS = SIDE * 1.5;
export const SHARP_TURN_RADIUS = SIDE / 2;

export function localPath(exit: ExitFace, s: number): PathSample {
    const turn = turnOf(exit);
    if (turn === 0) {
        const travel = { x: 0, y: 1 };
        return { point: { x: 0, y: -APOTHEM + 2 * APOTHEM * s }, travel, right: rightOf(travel) };
    }
    const sweep = (Math.abs(turn) * Math.PI) / 3;
    const radius = Math.abs(turn) === 1 ? WIDE_TURN_RADIUS : SHARP_TURN_RADIUS;
    const side = Math.sign(turn); // +1 à droite, -1 à gauche
    const center = { x: side * radius, y: -APOTHEM };
    // Depuis le centre, l'entrée est vue à 180° (virage à droite) ou 0° (à gauche).
    const start = side > 0 ? Math.PI : 0;
    const angle = start - side * sweep * s;
    const point = add(center, { x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
    // Tangente dans le sens de la marche : dérivée de l'angle, de signe -side.
    const travel = { x: side * Math.sin(angle), y: -side * Math.cos(angle) };
    return { point, travel, right: rightOf(travel) };
}

/** Longueur de l'axe, en unités : ce que parcourt une voiture qui suit le milieu de la piste. */
export function pathLength(exit: ExitFace): number {
    const turn = Math.abs(turnOf(exit));
    if (turn === 0) return 2 * APOTHEM;
    return (turn === 1 ? WIDE_TURN_RADIUS : SHARP_TURN_RADIUS) * ((turn * Math.PI) / 3);
}

export function rotate(v: Vec2, heading: Heading): Vec2 {
    const angle = -(heading * Math.PI) / 3;
    const c = Math.cos(angle);
    const sn = Math.sin(angle);
    return { x: v.x * c - v.y * sn, y: v.x * sn + v.y * c };
}

export function worldPath(center: Vec2, heading: Heading, exit: ExitFace, s: number): PathSample {
    const local = localPath(exit, s);
    return {
        point: add(center, rotate(local.point, heading)),
        travel: rotate(local.travel, heading),
        right: rotate(local.right, heading),
    };
}

/** Point du profil à l'unité `u` (0 à gauche, 8 à droite) sur l'échantillon donné. */
export function profilePoint(sample: PathSample, u: number): Vec2 {
    return add(sample.point, scale(sample.right, u - SIDE / 2));
}

/**
 * Où le profil change le long de l'axe : constant avant `start`, constant après `end`, transition
 * entre les deux. La spec (2.3, croquis 4) parle de la bande centrale ; l'étaler davantage adoucit
 * les décalages de position, les faces restant identiques puisque la transition est finie à s = 1.
 */
export interface TransitionSpan {
    readonly start: number;
    readonly end: number;
}

export const DEFAULT_TRANSITION: TransitionSpan = { start: 0.3, end: 0.7 };

/** Transition centrée couvrant une fraction `extent` de la tuile (0,4 par défaut, 1 = toute la tuile). */
export function transitionOfExtent(extent: number): TransitionSpan {
    const half = Math.min(1, Math.max(0.01, extent)) / 2;
    return { start: 0.5 - half, end: 0.5 + half };
}

/**
 * Avancement de la transition, de 0 (profil d'entrée) à 1 (profil de sortie). Interpolation
 * quintique (smootherstep) : dérivées première et seconde nulles aux bornes, donc pas de saut de
 * courbure là où le décalage commence et finit.
 */
export function transition(s: number, span: TransitionSpan = DEFAULT_TRANSITION): number {
    const t = Math.min(1, Math.max(0, (s - span.start) / (span.end - span.start)));
    return t * t * t * (t * (t * 6 - 15) + 10);
}

export function lerpSpan(
    entry: [number, number],
    exit: [number, number],
    s: number,
    span: TransitionSpan = DEFAULT_TRANSITION,
): [number, number] {
    const t = transition(s, span);
    return [entry[0] + (exit[0] - entry[0]) * t, entry[1] + (exit[1] - entry[1]) * t];
}

/** Inverse de `rotate` : ramène un vecteur du monde dans le repère local d'une tuile orientée `heading`. */
export function unrotate(v: Vec2, heading: Heading): Vec2 {
    return rotate(v, ((6 - heading) % 6) as Heading);
}

/**
 * Paramètre `s` du point de l'axe le plus proche d'un point du repère local. Sert à donner une
 * hauteur à n'importe quel point de la tuile, paysage compris. Au sommet d'une épingle, tous les
 * points de l'axe sont à égale distance : on rend 0,5.
 */
export function localAxisParameter(exit: ExitFace, p: Vec2): number {
    const turn = turnOf(exit);
    if (turn === 0) return clamp01((p.y + APOTHEM) / (2 * APOTHEM));
    const sweep = (Math.abs(turn) * Math.PI) / 3;
    const radius = Math.abs(turn) === 1 ? WIDE_TURN_RADIUS : SHARP_TURN_RADIUS;
    const side = Math.sign(turn);
    const dx = p.x - side * radius;
    const dy = p.y + APOTHEM;
    if (Math.hypot(dx, dy) < 1e-9) return 0.5;
    const start = side > 0 ? Math.PI : 0;
    const period = (2 * Math.PI) / sweep;
    let s = ((start - Math.atan2(dy, dx)) * side) / sweep;
    s = ((s % period) + period) % period;
    if (s > 1 + (period - 1) / 2) s -= period;
    return clamp01(s);
}

export function axisParameter(center: Vec2, heading: Heading, exit: ExitFace, p: Vec2): number {
    return localAxisParameter(exit, unrotate({ x: p.x - center.x, y: p.y - center.y }, heading));
}

function clamp01(value: number): number {
    return Math.min(1, Math.max(0, value));
}

function rightOf(travel: Vec2): Vec2 {
    return { x: travel.y, y: -travel.x };
}
