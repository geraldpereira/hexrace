import { type TurnKind } from '@tile/entity/face';

/** The most a tile may climb by exit, along the axis; a turn's inner edge is steeper (spec 2.3). */
export const MAX_SLOPE: Readonly<Record<TurnKind, number>> = {
  straight: 0.2,
  wide: 0.15,
  sharp: 0.1,
};

/** The generator stays below the hand: half the threshold. */
export const GENERATOR_SLOPE_FACTOR = 0.5;
