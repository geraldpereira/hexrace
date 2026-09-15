import { CATALOG_FILE } from '@track/entity/examples/catalog';
import { CURVES_FILE } from '@track/entity/examples/curves';
import {
  HEXAGON_FILE,
  INVALID_FILE,
  OVERLAP_FILE,
  RELIEF_FILE,
  STRAIGHT_LINE_FILE,
  TRIANGLE_FILE,
} from '@track/entity/examples/small-loops';
import { SMALL_RING_FILE } from '@track/entity/examples/small-ring';
import { BENDS_FILE, BORDERS_FILE, SURFACES_FILE } from '@track/entity/examples/surface-runs';

/** The example tracks shipped with the module, as track files (functional spec 5.4). */
export const EXAMPLE_TRACK_FILES: readonly string[] = [
  SMALL_RING_FILE,
  CURVES_FILE,
  CATALOG_FILE,
  SURFACES_FILE,
  BORDERS_FILE,
  BENDS_FILE,
  RELIEF_FILE,
  STRAIGHT_LINE_FILE,
  HEXAGON_FILE,
  TRIANGLE_FILE,
  OVERLAP_FILE,
  INVALID_FILE,
];
