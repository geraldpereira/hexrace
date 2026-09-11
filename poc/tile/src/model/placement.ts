import type { ExitFace } from './face';
import { faceIndex } from './face';
import type { Profile } from './profile';
import type { Tile } from './tile';
import type { Track } from './track';
import { entryProfile, isClosed } from './track';
import { faceSlopes } from './slope';

/**
 * Placement d'une piste sur la grille (spec 2.6, 5.4) : une liste ordonnée de tuiles devient des
 * cases et des orientations, sans qu'aucune position ne soit écrite dans les données.
 *
 * La grille est en coordonnées axiales entières (q, r), côté plat vers l'avant. Une orientation
 * (`Heading`) est le rang, dans le sens horaire depuis le nord, de la direction vers laquelle
 * pointe la face 12 de la tuile. Les six directions absolues sont donc les six faces d'une tuile
 * orientée au nord.
 */

export interface Cell {
    readonly q: number;
    readonly r: number;
}

export type Heading = 0 | 1 | 2 | 3 | 4 | 5;

/** Case voisine dans chaque direction absolue, rang 0 = nord puis sens horaire. */
export const HEADING_OFFSETS: readonly Cell[] = [
    { q: 0, r: 1 },
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
];

export function neighbor(cell: Cell, heading: Heading): Cell {
    const offset = HEADING_OFFSETS[heading] ?? { q: 0, r: 0 };
    return { q: cell.q + offset.q, r: cell.r + offset.r };
}

export function sameCell(a: Cell, b: Cell): boolean {
    return a.q === b.q && a.r === b.r;
}

export function cellKey(cell: Cell): string {
    return `${cell.q},${cell.r}`;
}

export function turnHeading(heading: Heading, turn: number): Heading {
    return ((((heading + turn) % 6) + 6) % 6) as Heading;
}

/**
 * Direction absolue de la face de sortie d'une tuile orientée `heading`. C'est aussi
 * l'orientation de la tuile suivante : sa face 12 pointe dans la direction où l'on sort.
 */
export function exitHeading(heading: Heading, exit: ExitFace): Heading {
    return turnHeading(heading, faceIndex(exit));
}

export interface Pose {
    readonly cell: Cell;
    readonly heading: Heading;
}

export function samePose(a: Pose, b: Pose): boolean {
    return sameCell(a.cell, b.cell) && a.heading === b.heading;
}

export interface PlacedTile extends Pose {
    readonly index: number;
    readonly tile: Tile;
    readonly entry: Profile;
    /** Pentes de la piste aux faces d'entrée et de sortie, déduites des tuiles voisines (voir slope.ts). */
    readonly entrySlope: number;
    readonly exitSlope: number;
}

export interface Placement {
    readonly tiles: readonly PlacedTile[];
    /** Où irait une tuile de plus : sert à vérifier la fermeture et à prolonger la piste. */
    readonly next: Pose;
}

export const ORIGIN: Pose = { cell: { q: 0, r: 0 }, heading: 0 };

/** Place les tuiles l'une après l'autre à partir de `start`, la première tuile pointant au nord. */
export function placeTrack(track: Track, start: Pose = ORIGIN): Placement {
    const tiles: PlacedTile[] = [];
    const slopes = faceSlopes(track);
    let pose = start;
    track.tiles.forEach((tile, index) => {
        tiles.push({
            ...pose,
            index,
            tile,
            entry: entryProfile(track, index),
            entrySlope: slopes[index] ?? 0,
            exitSlope: slopes[index + 1] ?? 0,
        });
        pose = {
            cell: neighbor(pose.cell, exitHeading(pose.heading, tile.exit)),
            heading: exitHeading(pose.heading, tile.exit),
        };
    });
    return { tiles, next: pose };
}

/**
 * En boucle, la tuile qui suivrait la dernière doit être la première, même case et même
 * orientation (spec 5.5). Retourne l'erreur en clair, ou null si la piste se referme.
 */
export function closureError(track: Track, placement: Placement): string | null {
    if (!isClosed(track)) return null;
    const first = placement.tiles[0];
    if (!first) return 'aucune tuile';
    if (samePose(placement.next, first)) return null;
    const { cell, heading } = placement.next;
    return (
        `la boucle ne se referme pas : après la dernière tuile on arrive en (${cell.q}, ${cell.r}) ` +
        `orienté ${heading}, le départ est en (${first.cell.q}, ${first.cell.r}) orienté ${first.heading}`
    );
}

/** Index de la première tuile posée sur une case déjà occupée, ou null si la piste ne se recoupe pas. */
export function firstOverlap(placement: Placement): number | null {
    const seen = new Set<string>();
    for (const placed of placement.tiles) {
        const key = cellKey(placed.cell);
        if (seen.has(key)) return placed.index;
        seen.add(key);
    }
    return null;
}

/** Ce qu'on peut construire d'une piste qui se recoupe : les tuiles jusqu'à la première fautive exclue. */
export function validPrefix(placement: Placement): Placement {
    const index = firstOverlap(placement);
    if (index === null) return placement;
    const tiles = placement.tiles.slice(0, index);
    const faulty = placement.tiles[index];
    return {
        tiles,
        next: faulty ? { cell: faulty.cell, heading: faulty.heading } : placement.next,
    };
}

/** Tuiles posées sur une case déjà occupée : la piste se recoupe (spec 5.5). */
export function overlapErrors(placement: Placement): string[] {
    const seen = new Map<string, number>();
    const errors: string[] = [];
    for (const placed of placement.tiles) {
        const key = cellKey(placed.cell);
        const previous = seen.get(key);
        if (previous === undefined) seen.set(key, placed.index);
        else errors.push(`la tuile ${placed.index} recouvre la tuile ${previous} en (${key})`);
    }
    return errors;
}
