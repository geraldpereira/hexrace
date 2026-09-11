import type { Profile } from '../profile';
import type { Tile } from '../tile';
import type { Track } from '../track';

/** La boucle de douze tuiles des croquis 5 et 6 : six droites et six virages à 60° à droite. */

const base: Profile = {
    position: 2,
    roadWidth: 3,
    leftShoulder: 1,
    rightShoulder: 1,
    height: 5,
    road: 1,
    shoulder: 1,
    landscape: 1,
};

function tile(exit: Tile['exit'], changes: Partial<Profile> = {}): Tile {
    return { exit, profile: { ...base, ...changes } };
}

export const petitAnneau: Track = {
    id: 'europe-ring-01',
    name: 'Petit Anneau',
    environment: 'europe',
    mode: 'track',
    laps: 3,
    tiles: [
        tile(12),
        tile(2),
        tile(12, { height: 6 }),
        tile(2, { height: 6, road: 2 }),
        tile(12, { height: 6, road: 2, position: 3, roadWidth: 2 }),
        tile(2, { height: 6, road: 2, position: 3, roadWidth: 2 }),
        tile(12, { height: 7, road: 2, position: 3, roadWidth: 2 }),
        tile(2, { height: 7, road: 2, position: 3, roadWidth: 2 }),
        tile(12, { height: 6 }),
        tile(2, { height: 6 }),
        tile(12),
        tile(2),
    ],
};
