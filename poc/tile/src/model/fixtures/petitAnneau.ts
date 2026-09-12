import type { Obstacle } from '../obstacle';
import type { Profile } from '../profile';
import type { Tile } from '../tile';
import type { Track } from '../track';

/**
 * La boucle de douze tuiles des croquis 5 et 6 : six droites et six virages à 60° à droite, avec
 * les obstacles du croquis 6 (dos d'âne, barrières, rampe, balle de foin) et quelques autres.
 */

const base: Profile = {
    position: 2,
    roadWidth: 3,
    leftShoulder: 1,
    rightShoulder: 1,
    height: 40,
    road: 1,
    shoulder: 1,
    landscape: 1,
};

function tile(exit: Tile['exit'], changes: Partial<Profile> = {}, obstacles?: Obstacle[]): Tile {
    return { exit, profile: { ...base, ...changes }, ...(obstacles ? { obstacles } : {}) };
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
        tile(12, { height: 48 }, [{ kind: 'bump', from: 0.45, to: 0.55 }]),
        tile(2, { height: 48, road: 2 }, [
            { kind: 'patch', from: 0.3, to: 0.7, offset: -0.5, width: 1.5, road: 3 },
        ]),
        tile(12, { height: 48, road: 2, position: 3, roadWidth: 2 }),
        tile(2, { height: 48, road: 2, position: 3, roadWidth: 2 }, [
            { kind: 'barrier', side: 'left', from: 0, to: 1 },
            { kind: 'barrier', side: 'right', from: 0, to: 1 },
        ]),
        tile(12, { height: 56, road: 2, position: 3, roadWidth: 2 }, [
            { kind: 'ramp', from: 0.4, to: 0.55 },
        ]),
        tile(2, { height: 56, road: 2, position: 3, roadWidth: 2 }, [
            { kind: 'hazard', size: 'medium', at: 0.5, offset: -1.5 },
        ]),
        tile(12, { height: 48 }),
        tile(2, { height: 48 }, [{ kind: 'hazard', size: 'small', at: 0.5, offset: 1 }]),
        tile(12, {}, [{ kind: 'barrier', side: 'right', from: 0.5, to: 1 }]),
        tile(2, {}, [
            { kind: 'barrier', side: 'right', from: 0, to: 0.5 },
            { kind: 'hazard', size: 'large', at: 0.6, offset: -2.5 },
        ]),
    ],
};
