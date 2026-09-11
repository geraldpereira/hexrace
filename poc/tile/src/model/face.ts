/**
 * Les six faces d'une tuile, nommées par les heures d'une horloge, côté plat vers l'avant
 * (spec 2.1) : 12 devant, 6 derrière, 2 et 4 à droite, 8 et 10 à gauche.
 */
export type Face = 12 | 2 | 4 | 6 | 8 | 10;

/** Toutes les faces dans le sens horaire à partir de 12. */
export const FACES: readonly Face[] = [12, 2, 4, 6, 8, 10];

/** La piste entre toujours par la face 6 : on vient de derrière. */
export const ENTRY_FACE = 6 as const;

/** Faces par lesquelles la piste peut sortir : toutes sauf celle par laquelle elle entre. */
export type ExitFace = Exclude<Face, typeof ENTRY_FACE>;

export const EXIT_FACES: readonly ExitFace[] = [12, 2, 4, 8, 10];

export function isFace(value: number): value is Face {
    return (FACES as readonly number[]).includes(value);
}

export function isExitFace(value: number): value is ExitFace {
    return (EXIT_FACES as readonly number[]).includes(value);
}

/** Rang d'une face dans le sens horaire : 12 → 0, 2 → 1, 4 → 2, 6 → 3, 8 → 4, 10 → 5. */
export function faceIndex(face: Face): number {
    return (face % 12) / 2;
}

/** Face de rang donné, modulo six : rang 0 → 12, rang 7 → 2, rang -1 → 10. */
export function faceFromIndex(index: number): Face {
    const wrapped = ((index % 6) + 6) % 6;
    return FACES[wrapped] ?? 12;
}

export function oppositeFace(face: Face): Face {
    return faceFromIndex(faceIndex(face) + 3);
}

/**
 * Virage que fait la piste en sortant par une face, en pas de 60°, positif vers la droite
 * (sens horaire) : 12 → 0, 2 → +1, 4 → +2, 8 → -2, 10 → -1.
 */
export type Turn = -2 | -1 | 0 | 1 | 2;

export function turnOf(exit: ExitFace): Turn {
    switch (exit) {
        case 12:
            return 0;
        case 2:
            return 1;
        case 4:
            return 2;
        case 8:
            return -2;
        case 10:
            return -1;
    }
}

/** Ligne droite, virage large (60°) ou virage serré (120°), selon la spec 2.1. */
export type TurnKind = 'straight' | 'wide' | 'sharp';

export function turnKind(exit: ExitFace): TurnKind {
    const turn = Math.abs(turnOf(exit));
    return turn === 0 ? 'straight' : turn === 1 ? 'wide' : 'sharp';
}
