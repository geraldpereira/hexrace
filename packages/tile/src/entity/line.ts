import { type SPoint } from '@tile/entity/slice';

/** Where the start or finish line sits on its tile's axis (functional spec 2.5). */
export const LINE_AT = 0.5;

/** One square of the chequered line, its points knowing their `s`. */
export interface CheckerSquare {
  readonly points: readonly SPoint[];
  readonly dark: boolean;
}
