import type { ExitFace } from '../face';
import type { Profile } from '../profile';
import type { Tile } from '../tile';
import type { Track } from '../track';

/**
 * Un catalogue de courbes : des virages à 60° (sorties 2 et 10) où la piste se déplace d'un bord de
 * la face à l'autre. Piste de 1 unité bordée d'un bas-côté de chaque côté : le bloc fait 3 unités,
 * la piste va donc de la position 2 à la 5. Dans un virage à droite, la position 5 est à
 * l'intérieur (rayon 10,5) et la 2 à l'extérieur (rayon 13,5) ; c'est l'inverse à gauche. Déplacer
 * la piste dans le virage le resserre ou l'ouvre.
 */

const base: Profile = {
    position: 2,
    roadWidth: 1,
    leftShoulder: 1,
    rightShoulder: 1,
    height: 24,
    road: 1,
    shoulder: 1,
    landscape: 1,
};

function tile(exit: ExitFace, position: number, height = base.height): Tile {
    return { exit, profile: { ...base, position, height } };
}

export const courbes: Track = {
    id: 'europe-curves-01',
    name: 'Courbes',
    environment: 'europe',
    mode: 'rally',
    tiles: [
        tile(12, 2), // départ, piste à gauche
        tile(2, 5), // droite qui se resserre : de l'extérieur vers l'intérieur
        tile(2, 5), // droite serrée constante, rayon 10,5
        tile(2, 2), // droite qui s'ouvre : de l'intérieur vers l'extérieur
        tile(12, 2), // ligne droite
        tile(10, 2), // gauche serrée constante : la position 2 est à l'intérieur
        tile(10, 5), // gauche qui s'ouvre
        tile(10, 5), // gauche large constante, rayon 13,5
        tile(12, 2), // ligne droite avec décalage de 5 à 2
        tile(2, 2, 32), // grand virage à droite sur deux tuiles, 120° au rayon 13,5, et montée
        tile(2, 2, 40), // d'une unité par tuile sur trois tuiles
        tile(12, 3, 48), // ligne droite, recentrage, fin de la montée
        tile(10, 3, 48), // chicane gauche-droite près du centre de la face, rayon 12
        tile(2, 3, 48),
        tile(12, 2, 48), // recentrage à gauche sur une droite
        tile(10, 3, 40), // gauche qui s'ouvre progressivement : une unité par tuile, en descente
        tile(10, 4, 32),
        tile(10, 5, 24),
        tile(12, 5, 24),
    ],
};
