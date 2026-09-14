import { type EnvironmentId } from '@hexrace/tile';
import {
  type GeneratorConfig,
  type Track,
  type TrackExamples,
  type TrackFileError,
  type TrackFiles,
  type TrackGenerator,
  DEFAULT_GENERATOR,
} from '@hexrace/track';

/** Where the track on show comes from. */
export type TrackSource = 'example' | 'text' | 'generated';

/** A track loaded, or what the reader refused, in words. */
export interface TrackLoad {
  readonly track: Track | null;
  readonly errors: readonly string[];
}

/**
 * What the lab edits about the track on show: which source it comes from, the dials of the
 * generator, how many tiles live around the player and where the player stands. Nothing here
 * knows three.js: it hands the showcase a track, or the reasons it could not read one.
 */
export class TrackDraft {
  source: TrackSource = 'example';
  example = 'europe-ring-01';
  /** The track file the page's text area holds. */
  text = '';
  seed = DEFAULT_GENERATOR.seed;
  environment: EnvironmentId = DEFAULT_GENERATOR.environment;
  turning = DEFAULT_GENERATOR.dials.turning;
  sharpness = DEFAULT_GENERATOR.dials.sharpness;
  relief = DEFAULT_GENERATOR.dials.relief;
  variety = DEFAULT_GENERATOR.dials.variety;
  length = DEFAULT_GENERATOR.length;
  obstacles = DEFAULT_GENERATOR.dials.obstacles;
  ahead = 4;
  behind = 2;
  /** Where the player stands along the track: whole part the tile, fraction the progress on it. */
  position = 0;
  smooth = false;
  outline = true;
  follow = true;
  map = true;

  config(): GeneratorConfig {
    return {
      environment: this.environment,
      seed: this.seed === '' ? 'hexrace' : this.seed,
      dials: {
        turning: this.turning,
        sharpness: this.sharpness,
        relief: this.relief,
        variety: this.variety,
        obstacles: this.obstacles,
      },
      length: this.length,
    };
  }

  load(examples: TrackExamples, files: TrackFiles, generator: TrackGenerator): TrackLoad {
    if (this.source === 'generated')
      return { track: generator.generate(this.config()), errors: [] };
    if (this.source === 'example') {
      const track = examples.of(this.example);
      return track
        ? { track, errors: [] }
        : { track: null, errors: [`no example ${this.example}`] };
    }
    const read = files.parse(this.text);
    if ('track' in read) return { track: read.track, errors: [] };
    return {
      track: null,
      errors: read.errors.map((error: TrackFileError) =>
        error.line === 0 ? error.message : `line ${String(error.line)}: ${error.message}`,
      ),
    };
  }
}
