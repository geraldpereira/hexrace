/**
 * The tile (functional spec 2). `entity/` is the data alone, interfaces and constants; `geometry/`
 * the logic in units as services by capacity, three.js and Jolt free; `TileMeshes` (render) and
 * `TileBodies` (physics) build on the same triangles in metres. A tile knows no track: the track
 * resolves the entry profile, the slopes and the position into a `TileSweep`.
 */
export {
  type Environment,
  type EnvironmentId,
  ENVIRONMENTS,
  ENVIRONMENT_IDS,
} from '@tile/entity/environment';
export {
  type ExitFace,
  type Face,
  type Turn,
  type TurnKind,
  ENTRY_FACE,
  EXIT_FACES,
  FACES,
} from '@tile/entity/face';
export { type Cell, type Heading, type Pose } from '@tile/entity/grid';
export { type TileIssue, type TileIssueCode } from '@tile/entity/issue';
export { type FaceFrame, SIDE } from '@tile/entity/layout';
export { type CheckerSquare, LINE_AT } from '@tile/entity/line';
export {
  type Barrier,
  type Footprint,
  type Hazard,
  type HazardSize,
  type Obstacle,
  type Patch,
  type RoadBand,
} from '@tile/entity/obstacle';
export { type PathSample, type TransitionSpan } from '@tile/entity/path';
export {
  type LandscapeType,
  type Profile,
  type RoadType,
  type ShoulderType,
  type ShoulderWidth,
  type Zone,
  FACE_WIDTH,
  MAX_BLOCK_WIDTH,
  MAX_HEIGHT,
  MAX_ROAD_WIDTH,
  MIN_HEIGHT,
  MIN_LANDSCAPE_WIDTH,
  MIN_ROAD_WIDTH,
} from '@tile/entity/profile';
export {
  type SPoint,
  type Slice,
  type ZonePolygon,
  type ZoneQuad,
  type ZoneSide,
} from '@tile/entity/slice';
export { type Surface } from '@tile/entity/surface';
export { type Boundaries, type TileSweep } from '@tile/entity/sweep';
export { type Tile, type TileProfiles } from '@tile/entity/tile';
export { type Paint, type TileBuild, type Triangle3 } from '@tile/entity/triangle';
export {
  HEIGHT_STEP_METERS,
  HEIGHT_UNIT,
  MAX_AMPLITUDE_STEPS,
  SKIRT_DEPTH_METERS,
  UNIT_METERS,
} from '@tile/entity/units';
export { Environments } from '@tile/geometry/environments';
export { Faces } from '@tile/geometry/faces';
export { Grid } from '@tile/geometry/grid';
export { Layout } from '@tile/geometry/layout';
export { Profiles } from '@tile/geometry/profiles';
export { Slopes } from '@tile/geometry/slopes';
export { TileGeometry } from '@tile/geometry/tile-geometry';
export { TileLines } from '@tile/geometry/tile-lines';
export { TileObstacles } from '@tile/geometry/tile-obstacles';
export { TilePaths } from '@tile/geometry/tile-paths';
export { TileSurfaces } from '@tile/geometry/tile-surfaces';
export { TileSweeper } from '@tile/geometry/tile-sweeper';
export { TileTriangles } from '@tile/geometry/tile-triangles';
export { TileValidation } from '@tile/geometry/tile-validation';
export { Units } from '@tile/geometry/units';
export { TileBodies } from '@tile/physics/tile-bodies';
export { type TileMesh, TileMeshes } from '@tile/render/tile-meshes';
