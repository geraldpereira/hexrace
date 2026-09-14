import { type EnvironmentId } from '@hexrace/tile';

import { type EnvironmentFeels } from '@car/entity/surface-feel';
import { DEEP, PACKED, ROCKY, SLICK } from '@car/entity/surfaces/frozen-feels';
import { BOGGY, LOOSE, SOFT, TURF } from '@car/entity/surfaces/loose-feels';
import { FIRM, ROUGH, WORN } from '@car/entity/surfaces/sealed-feels';

/** How each rank of each environment drives; ranks go by decreasing grip (technical spec 4.2). */
export const SURFACE_CATALOG: Readonly<Record<EnvironmentId, EnvironmentFeels>> = {
  europe: {
    road: [FIRM, WORN, ROUGH],
    shoulder: [LOOSE, TURF, BOGGY],
    landscape: [TURF, ROCKY],
  },
  north: {
    road: [PACKED, DEEP, SLICK],
    shoulder: [PACKED, DEEP, SLICK],
    landscape: [DEEP, ROCKY],
  },
  africa: {
    road: [ROUGH, LOOSE, SOFT],
    shoulder: [LOOSE, SOFT, BOGGY],
    landscape: [SOFT, ROCKY],
  },
};
