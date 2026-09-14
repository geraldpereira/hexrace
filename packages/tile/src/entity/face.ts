/** The faces as clock hours, flat side forward: 12 ahead, 6 behind, 2 and 4 right (spec 2.1). */
export type Face = 12 | 2 | 4 | 6 | 8 | 10;

/** Every face, clockwise from 12. */
export const FACES: readonly Face[] = [12, 2, 4, 6, 8, 10];

/** The track always enters by face 6: we come from behind. */
export const ENTRY_FACE = 6 as const;

/** Where the track may leave: every face but the one it enters by. */
export type ExitFace = Exclude<Face, typeof ENTRY_FACE>;

export const EXIT_FACES: readonly ExitFace[] = [12, 2, 4, 8, 10];

/** The turn the track makes leaving by a face, in 60° steps, positive to the right (clockwise). */
export type Turn = -2 | -1 | 0 | 1 | 2;

/** Straight, wide turn (60°) or sharp turn (120°), as the functional spec 2.1 names them. */
export type TurnKind = 'straight' | 'wide' | 'sharp';
