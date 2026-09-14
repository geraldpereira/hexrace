import { type TrackMode } from '@hexrace/track';

/** Two or three laps at most, to keep a race short (functional spec 4.2). */
export const DEFAULT_LAPS = 2;

/**
 * What the race asks of the driver. The mode says how it ends, on the lap count in Track and on
 * the finish line in Rally; `laps` is ignored in Rally. It is read apart from the track so a
 * panel can shorten a race without touching the file it came from.
 */
export interface RaceRules {
  readonly mode: TrackMode;
  readonly laps: number;
}

export const DEFAULT_RACE_RULES: RaceRules = { mode: 'track', laps: DEFAULT_LAPS };
