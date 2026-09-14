import { type Obstacle } from '@tile/entity/obstacles/obstacle';
import { type SPoint } from '@tile/entity/slice';

/**
 * An obstacle laid on the tile: its reserved outline and its body, the same except for barriers.
 * Along the road it sits at a fraction of the axis, across it at an offset in units from the road
 * centre, negative left, following the road as it moves. A hazard is level, all corners at the
 * height of its centre; a band follows the road between two fractions, left edge out, right back.
 */
export interface Footprint {
  readonly obstacle: Obstacle;
  readonly outline: readonly SPoint[];
  readonly body: readonly SPoint[];
}
