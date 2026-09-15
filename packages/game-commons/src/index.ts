/**
 * The common trunk of the game modes (functional spec 4.1), where the track meets the car.
 * `entity/` is the data alone, the race snapshot, its rules and its events; `race/` runs the
 * countdown, the chrono on the wall clock, the laps and the best times, with no scene in sight;
 * `stage/` owns what the scene holds, the tile window, the ground under a wheel, the fall, and
 * the director that ties them to a `CarController`. It knows no hud and draws no interface.
 */
export {
  type RaceCut,
  type RaceFall,
  type RaceFinish,
  type RaceLap,
  type RaceStart,
} from '@game-commons/entity/race-events';
export { type RaceRules, DEFAULT_LAPS, DEFAULT_RACE_RULES } from '@game-commons/entity/race-rules';
export { type RacePhase, type RaceState, IDLE_RACE_STATE } from '@game-commons/entity/race-state';
export { type SavedTimes, BEST_TIMES_KEY } from '@game-commons/entity/saved-times';
export { type SpawnPose } from '@game-commons/entity/spawn-pose';
export { BestTimes } from '@game-commons/race/best-times';
export { CountdownTimer } from '@game-commons/race/countdown-timer';
export { LapCounter } from '@game-commons/race/lap-counter';
export { RaceClock } from '@game-commons/race/race-clock';
export { RaceMachine } from '@game-commons/race/race-machine';
export { FallWatch, FALL_MARGIN_METERS } from '@game-commons/stage/fall-watch';
export { RaceDirector } from '@game-commons/stage/race-director';
export { SpawnSpots } from '@game-commons/stage/spawn-spots';
export { type FadingTile, FADE_SECONDS, TileFader } from '@game-commons/stage/tile-fader';
export { TrackProbe } from '@game-commons/stage/track-probe';
export { TrackStage } from '@game-commons/stage/track-stage';
