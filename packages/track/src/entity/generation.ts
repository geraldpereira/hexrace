import { type EnvironmentId } from '@hexrace/tile';

import { type TrackMode } from '@track/entity/track';

/** The dials of the generator, 0 to 9 each (functional spec 5.3). */
export interface Dials {
  /** Share of the tiles that turn. */
  readonly turning: number;
  /** Share of the turns that are hairpins, and how many follow one another. */
  readonly sharpness: number;
  /** How often the height changes. */
  readonly relief: number;
  /** How often width, position and types change. */
  readonly variety: number;
  /** How dense the obstacles are. */
  readonly obstacles: number;
}

/** A whole generator setting: the same string always gives the same track. */
export interface GeneratorConfig {
  readonly environment: EnvironmentId;
  readonly seed: string;
  readonly dials: Dials;
  readonly length: number;
  /** A loop in Track mode, a point to point in Rally; a loop that will not close falls back. */
  readonly mode: TrackMode;
}

export const DEFAULT_GENERATOR: GeneratorConfig = {
  environment: 'europe',
  seed: 'hexrace',
  dials: { turning: 5, sharpness: 3, relief: 4, variety: 4, obstacles: 3 },
  length: 30,
  mode: 'rally',
};

/** The most tiles one string may ask for. */
export const MAX_GENERATED_TILES = 500;
