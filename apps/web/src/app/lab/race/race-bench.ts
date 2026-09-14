import { type CarController } from '@hexrace/car';
import { type RaceDirector, type TrackStage } from '@hexrace/game-commons';
import { type TrackMode } from '@hexrace/track';

import { type TrackDraft } from '@ui/lab/track/track-draft';

/** The title of the showcase's folder in the debug panel, and the key its values are kept under. */
export const RACE_TITLE = 'Race';

/** What the race asks of the driver, as the panel edits it: `RaceRules` is read-only, this is not. */
export interface RaceSettings {
  mode: TrackMode;
  laps: number;
}

/**
 * What the debug panel of the race showcase is allowed to touch: the draft the track is read from,
 * the rules of the race, and the three pieces the scene holds. The page implements it, so the
 * panel never reaches into the page's own fields. Everything here exists once the physics is in.
 */
export interface RaceBench {
  readonly draft: TrackDraft;
  readonly settings: RaceSettings;
  readonly stage: TrackStage;
  readonly director: RaceDirector;
  readonly car: CarController;
  /** The best time of the track on show, already in words. */
  readonly best: string;
  /** The tile the car stands on, whole, as the readouts show it. */
  readonly tile: number;
  rebuild(): void;
  restart(): void;
  startSound(): void;
  clearBest(): void;
}
