import type { ExitFace } from '../face';
import type { Profile } from '../profile';
import type { Tile } from '../tile';
import type { Track } from '../track';

/**
 * Toutes les sorties (12, 2, 4, 8, 10) combinées à des décalages de position : en ligne droite, en
 * virage large et en épingle, vers l'intérieur comme vers l'extérieur. Piste de 1 unité bordée,
 * positions de 2 à 5.
 */

const base: Profile = {
    position: 3,
    roadWidth: 1,
    leftShoulder: 1,
    rightShoulder: 1,
    height: 4,
    road: 1,
    shoulder: 1,
    landscape: 1,
};

function tile(exit: ExitFace, position: number): Tile {
    return { exit, profile: { ...base, position } };
}

export const catalogue: Track = {
    id: 'north-catalog-01',
    name: 'Catalogue',
    environment: 'north',
    mode: 'rally',
    tiles: [
        tile(12, 3), // départ
        tile(12, 5), // droite, décalage de 2 vers la droite
        tile(12, 2), // droite, décalage de 3 vers la gauche
        tile(2, 5), // virage large à droite, de l'extérieur vers l'intérieur
        tile(4, 2), // épingle à droite, de l'intérieur vers l'extérieur
        tile(12, 2), // droite
        tile(10, 2), // virage large à gauche, à l'intérieur, constant
        tile(8, 5), // épingle à gauche, de l'intérieur vers l'extérieur
        tile(12, 5), // droite
        tile(4, 5), // épingle à droite, à l'intérieur, constante : le plus serré possible
        tile(2, 3), // virage large à droite, vers le centre
        tile(8, 3), // épingle à gauche au centre, constante
        tile(10, 5), // virage large à gauche, vers l'extérieur
        tile(12, 3), // droite, recentrage
        tile(4, 3), // épingle à droite puis épingle à gauche au centre : un décrochement
        tile(8, 3),
        tile(12, 3),
    ],
};
