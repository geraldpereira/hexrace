/**
 * The tile (functional spec 2): the model of the POC in units, three.js and Jolt free, in
 * `entity/`, as data types, pure arithmetic, and services by capability (`TileSweeper`,
 * `TileGeometry`, `TileObstacles`, `TileSurfaces`, `TileLines`, `TileTriangles`, `Environments`);
 * `TileMeshes` (render) and `TileBodies` (physics) build on the same triangles in metres. A tile
 * knows no track: the track resolves the entry profile, the slopes and the position into a sweep.
 */
export { type CheckerSquare, LINE_AT, TileLines } from '@tile/entity/checker';
export { type Environment, type EnvironmentId, Environments } from '@tile/entity/environment';
export {
  type ExitFace,
  type Face,
  type Turn,
  type TurnKind,
  ENTRY_FACE,
  EXIT_FACES,
  FACES,
  faceFromIndex,
  faceIndex,
  isExitFace,
  isFace,
  oppositeFace,
  turnKind,
  turnOf,
} from '@tile/entity/face';
export {
  type SPoint,
  type Slice,
  type ZonePolygon,
  type ZoneQuad,
  type ZoneSide,
  HEX_AREA,
  TileGeometry,
  polygonArea,
} from '@tile/entity/geometry';
export {
  type Cell,
  type Heading,
  type Pose,
  HEADING_OFFSETS,
  cellKey,
  exitHeading,
  neighbor,
  sameCell,
  samePose,
  turnHeading,
} from '@tile/entity/grid';
export {
  type FaceFrame,
  type Vec2,
  APOTHEM,
  PITCH,
  SIDE,
  add,
  blockSpan,
  cellToWorld,
  directionVector,
  distance,
  entryFrame,
  exitFrame,
  facePoint,
  hexCorners,
  insideConvex,
  rightOf,
  roadSpan,
  scale,
} from '@tile/entity/layout';
export {
  type Barrier,
  type Footprint,
  type Hazard,
  type HazardSize,
  type Obstacle,
  type Patch,
  type RoadBand,
  BARRIER_BODY_WIDTH,
  BARRIER_FOOTPRINT_WIDTH,
  HAZARD_FOOTPRINT,
  TileObstacles,
  describeObstacle,
} from '@tile/entity/obstacle';
export {
  type PathSample,
  type TransitionSpan,
  DEFAULT_TRANSITION,
  SHARP_TURN_RADIUS,
  WIDE_TURN_RADIUS,
  axisParameter,
  lerpSpan,
  localAxisParameter,
  localPath,
  pathLength,
  profilePoint,
  rotate,
  transition,
  transitionOfExtent,
  unrotate,
  worldPath,
} from '@tile/entity/path';
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
  blockEnd,
  blockStart,
  blockWidth,
  isValidProfile,
  profileErrors,
  sameProfile,
  zoneAt,
  zones,
} from '@tile/entity/profile';
export {
  GENERATOR_SLOPE_FACTOR,
  MAX_SLOPE,
  hermite,
  maxHeightSteps,
  slopeOf,
  steffen,
} from '@tile/entity/slope';
export { type Surface, TileSurfaces } from '@tile/entity/surface';
export { type Boundaries, type TileSweep, TileSweeper } from '@tile/entity/sweep';
export { type Tile, type TileProfiles } from '@tile/entity/tile';
export {
  type Paint,
  type TileBuild,
  type Triangle3,
  type Vec3,
  TileTriangles,
  toWorld,
} from '@tile/entity/triangles';
export {
  HEIGHT_STEP_METERS,
  HEIGHT_UNIT,
  MAX_AMPLITUDE_STEPS,
  SKIRT_DEPTH_METERS,
  UNIT_METERS,
  metersToUnits,
  stepsToUnits,
  unitsToMeters,
} from '@tile/entity/units';
export { TileBodies } from '@tile/physics/tile-body';
export { OBSTACLE_COLORS, type TileMesh, TileMeshes } from '@tile/render/tile-mesh';
