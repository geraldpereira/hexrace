/** The faces as clock hours, flat side forward: 12 ahead, 6 behind, 2 and 4 right (spec 2.1). */
export type Face = 12 | 2 | 4 | 6 | 8 | 10;

/** Every face, clockwise from 12. */
export const FACES: readonly Face[] = [12, 2, 4, 6, 8, 10];

/** The track always enters by face 6: we come from behind. */
export const ENTRY_FACE = 6 as const;

/** Where the track may leave: every face but the one it enters by. */
export type ExitFace = Exclude<Face, typeof ENTRY_FACE>;

export const EXIT_FACES: readonly ExitFace[] = [12, 2, 4, 8, 10];

export function isFace(value: number): value is Face {
  return (FACES as readonly number[]).includes(value);
}

export function isExitFace(value: number): value is ExitFace {
  return (EXIT_FACES as readonly number[]).includes(value);
}

/** Rank of a face clockwise: 12 → 0, 2 → 1, 4 → 2, 6 → 3, 8 → 4, 10 → 5. */
export function faceIndex(face: Face): number {
  return (face % 12) / 2;
}

/** The face of a rank, modulo six: rank 0 → 12, rank 7 → 2, rank -1 → 10. */
export function faceFromIndex(index: number): Face {
  const wrapped = ((index % 6) + 6) % 6;
  return FACES[wrapped] ?? 12;
}

export function oppositeFace(face: Face): Face {
  return faceFromIndex(faceIndex(face) + 3);
}

/** The turn the track makes leaving by a face, in 60° steps, positive to the right (clockwise). */
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

/** Straight, wide turn (60°) or sharp turn (120°), as the functional spec 2.1 names them. */
export type TurnKind = 'straight' | 'wide' | 'sharp';

export function turnKind(exit: ExitFace): TurnKind {
  const turn = Math.abs(turnOf(exit));
  if (turn === 0) return 'straight';
  return turn === 1 ? 'wide' : 'sharp';
}
