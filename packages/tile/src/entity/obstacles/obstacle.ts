import { type Barrier } from '@tile/entity/obstacles/barrier';
import { type Hazard } from '@tile/entity/obstacles/hazard';
import { type Patch } from '@tile/entity/obstacles/patch';
import { type RoadBand } from '@tile/entity/obstacles/road-band';

/** The obstacles of a tile (functional spec 2.4), placed relative to the road, never to the face. */
export type Obstacle = Hazard | Barrier | RoadBand | Patch;
