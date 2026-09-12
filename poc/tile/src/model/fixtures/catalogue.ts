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
    height: 32,
    road: 1,
    shoulder: 1,
    landscape: 1,
};

function tile(exit: ExitFace, position: number, height = base.height): Tile {
    return { exit, profile: { ...base, position, height } };
}

export const catalogue: Track = {
    id: 'north-catalog-01',
    name: 'Catalogue',
    environment: 'north',
    mode: 'rally',
    tiles: [
        tile(12, 3), // départ
        tile(12, 5, 40), // droite, décalage de 2 vers la droite ; montée d'une unité par tuile
        tile(12, 2, 48), // droite, décalage de 3 vers la gauche
        tile(2, 5, 56), // virage large à droite, de l'extérieur vers l'intérieur, fin de la montée
        tile(4, 2, 56), // épingle à droite, de l'intérieur vers l'extérieur
        tile(12, 2, 56), // droite
        tile(10, 2, 56), // virage large à gauche, à l'intérieur, constant
        tile(8, 5, 56), // épingle à gauche, de l'intérieur vers l'extérieur
        tile(12, 5, 56), // droite
        tile(4, 5, 56), // épingle à droite, à l'intérieur, constante : le plus serré possible
        tile(2, 3, 56), // virage large à droite, vers le centre
        tile(8, 3, 56), // épingle à gauche au centre, constante
        tile(10, 5, 48), // virage large à gauche, vers l'extérieur ; descente sur trois tuiles
        tile(12, 3, 32), // droite, recentrage, descente de 16 pas (13,6 %)
        tile(4, 3, 32), // épingle à droite puis épingle à gauche au centre : un décrochement
        tile(8, 3, 32),
        tile(12, 3, 32),
    ],
};
