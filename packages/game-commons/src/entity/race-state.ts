/** Where a race stands: counting down, running, or over (functional spec 4.1). */
export type RacePhase = 'countdown' | 'racing' | 'finished';

/**
 * The snapshot of a race, read every frame by the HUD and the showcase, written by nobody else
 * than the director. `position` is the continuous place on the track, whole part the tile and
 * fraction the progress on it, the very number `TrackWindow` reads.
 */
export interface RaceState {
  phase: RacePhase;
  /** 3, 2, 1, then 0 for the GO, then null: what the `Countdown` component shows. */
  countdownStep: number | null;
  elapsedMs: number;
  /** The lap being driven, 1 from the GO; always 1 in Rally. */
  lap: number;
  lapCount: number;
  wrongWay: boolean;
  position: number;
}

/** A race that has not begun: what a state starts at, and what a test compares to. */
export const IDLE_RACE_STATE: Readonly<RaceState> = {
  phase: 'countdown',
  countdownStep: null,
  elapsedMs: 0,
  lap: 0,
  lapCount: 1,
  wrongWay: false,
  position: 0,
};
