import { Injectable } from '@angular/core';

import {
  type ExitFace,
  type Face,
  type Turn,
  type TurnKind,
  EXIT_FACES,
  FACES,
} from '@tile/entity/face';

/**
 * The arithmetic of the clock faces (functional spec 2.1): their rank clockwise from 12, the
 * opposite face, and what leaving by a face means as a turn, in 60° steps positive to the right.
 */
@Injectable({ providedIn: 'root' })
export class Faces {
  isFace(value: number): value is Face {
    return (FACES as readonly number[]).includes(value);
  }

  isExit(value: number): value is ExitFace {
    return (EXIT_FACES as readonly number[]).includes(value);
  }

  /** Rank of a face clockwise: 12 → 0, 2 → 1, 4 → 2, 6 → 3, 8 → 4, 10 → 5. */
  index(face: Face): number {
    return (face % 12) / 2;
  }

  /** The face of a rank, modulo six: rank 0 → 12, rank 7 → 2, rank -1 → 10. */
  fromIndex(index: number): Face {
    const wrapped = ((index % 6) + 6) % 6;
    return FACES[wrapped] ?? 12;
  }

  opposite(face: Face): Face {
    return this.fromIndex(this.index(face) + 3);
  }

  turnOf(exit: ExitFace): Turn {
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

  turnKind(exit: ExitFace): TurnKind {
    const turn = Math.abs(this.turnOf(exit));
    if (turn === 0) return 'straight';
    return turn === 1 ? 'wide' : 'sharp';
  }
}
