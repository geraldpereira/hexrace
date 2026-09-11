import type { Profile } from '../profile';
import type { Tile } from '../tile';
import type { Track } from '../track';

/** Les plus petites boucles possibles : trois virages serrés autour d'un sommet, six virages larges autour d'une tuile. */

const base: Profile = {
    position: 3,
    roadWidth: 2,
    leftShoulder: 1,
    rightShoulder: 1,
    height: 3,
    road: 2,
    shoulder: 2,
    landscape: 2,
};

function tile(exit: Tile['exit'], changes: Partial<Profile> = {}): Tile {
    return { exit, profile: { ...base, ...changes } };
}

export const triangle: Track = {
    id: 'africa-triangle-01',
    name: 'Triangle',
    environment: 'africa',
    mode: 'track',
    tiles: [tile(4), tile(4, { height: 4 }), tile(4)],
};

export const hexagone: Track = {
    id: 'north-ring-01',
    name: 'Hexagone',
    environment: 'north',
    mode: 'track',
    tiles: [
        tile(10),
        tile(10, { height: 4 }),
        tile(10, { height: 4 }),
        tile(10),
        tile(10, { position: 2, roadWidth: 3 }),
        tile(10),
    ],
};

/** Une ligne droite en Rally, avec un rétrécissement au milieu. */
export const ligne: Track = {
    id: 'europe-line-01',
    name: 'Ligne droite',
    environment: 'europe',
    mode: 'rally',
    tiles: [
        tile(12),
        tile(12, { roadWidth: 1, position: 4, leftShoulder: 0, height: 4 }),
        tile(12, { height: 7 }),
        tile(12, { height: 7 }),
    ],
};

/** Six virages larges puis une droite : la septième tuile retombe sur la première. */
export const recoupe: Track = {
    id: 'europe-overlap-01',
    name: 'Recoupe',
    environment: 'europe',
    mode: 'rally',
    tiles: [tile(2), tile(2), tile(2), tile(2), tile(2), tile(2), tile(12)],
};
