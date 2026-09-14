/**
 * The track (functional spec 5): an ordered list of tiles laid on the grid, no position ever
 * written. `entity/` is the data alone; `geometry/` places, slopes, marks, validates and windows
 * it in units; `format/` reads and writes the track file of technical spec 3.3; `generation/`
 * draws one from a seed; `TrackMeshes` and `TrackBodies` build the tiles of the window in metres.
 */
export { type Cursor, type PlayerPose, TILES_AHEAD, TILES_BEHIND } from '@track/entity/cursor';
export { EXAMPLE_TRACK_FILES } from '@track/entity/examples/examples';
export { type TrackFileError, type TrackParse } from '@track/entity/file-error';
export {
  type Dials,
  type GeneratorConfig,
  DEFAULT_GENERATOR,
  MAX_GENERATED_TILES,
} from '@track/entity/generation';
export { type TrackIssue, type TrackIssueCode, type TrackReview } from '@track/entity/issue';
export { type LineMark, type MarkKind } from '@track/entity/mark';
export { type Overlap, type PlacedTile, type Placement, ORIGIN } from '@track/entity/placement';
export { type Track, type TrackMode, TRACK_MODES } from '@track/entity/track';
export { TrackMarks } from '@track/geometry/track-marks';
export { TrackPlacement } from '@track/geometry/track-placement';
export { TrackProfiles } from '@track/geometry/track-profiles';
export { TrackSlopes } from '@track/geometry/track-slopes';
export { TrackSweeps } from '@track/geometry/track-sweeps';
export { TrackValidation } from '@track/geometry/track-validation';
export { TrackWindow } from '@track/geometry/track-window';
export { ObstacleText } from '@track/format/obstacle-text';
export { TileText, type TileTextParse } from '@track/format/tile-text';
export { TrackExamples } from '@track/format/track-examples';
export { TrackFiles } from '@track/format/track-files';
export { type ExitQuery, ExitChoices } from '@track/generation/exit-choices';
export { GeneratorConfigs } from '@track/generation/generator-configs';
export { ObstacleSeeder } from '@track/generation/obstacle-seeder';
export { type HeightRange, type ProfileStep, ProfileSteps } from '@track/generation/profile-steps';
export { TrackGenerator } from '@track/generation/track-generator';
export { TrackBodies } from '@track/physics/track-bodies';
export {
  type TileGroupOptions,
  type TrackGroupOptions,
  TrackMeshes,
} from '@track/render/track-meshes';
