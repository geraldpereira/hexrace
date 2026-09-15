import { Injectable } from '@angular/core';
import { type EnvironmentId, type Swell, type Zone } from '@hexrace/tile';

import { type SurfaceFeel, type SurfaceQuery } from '@car/entity/surface-feel';
import { type SurfaceRanks } from '@car/entity/surface-ranks';
import { type SwellRanks } from '@car/entity/surface-swells';
import { SURFACE_CATALOG } from '@car/entity/surfaces/surface-catalog';
import { SWELL_CATALOG } from '@car/entity/surfaces/swell-catalog';

/**
 * The per-surface table, and it lives here (technical spec 4.2): `tile` knows a rank and a
 * colour, the car knows what that rank does to a tyre. A query gives the environment, the zone
 * and the rank, 1 first; out of range ranks fall back on the first, so a malformed tile still
 * drives. A rank's long swell reads the same way, and is both what the wheel climbs and what the
 * ground mesh shades. `of` lists an environment's eight ranks in the palette's order, for the panel.
 */
@Injectable({ providedIn: 'root' })
export class Surfaces {
  feel(query: SurfaceQuery): SurfaceFeel {
    const ranks = this.ranks(query.environment, query.zone);
    return ranks[query.rank - 1] ?? ranks[0];
  }

  /** The long swell a rank rides on, the crests and hollows the ground mesh only shades. */
  swell(query: SurfaceQuery): Swell {
    const ranks = this.swells(query.environment, query.zone);
    return ranks[query.rank - 1] ?? ranks[0];
  }

  /** The swells of one zone of one environment, in the order of the ranks. */
  swells(environment: EnvironmentId, zone: Zone): SwellRanks {
    const swells = SWELL_CATALOG[environment];
    if (zone === 'road') return swells.road;
    return zone === 'shoulder' ? swells.shoulder : swells.landscape;
  }

  /** The ranks of one zone of one environment, first the grippiest. */
  ranks(environment: EnvironmentId, zone: Zone): SurfaceRanks {
    const feels = SURFACE_CATALOG[environment];
    if (zone === 'road') return feels.road;
    return zone === 'shoulder' ? feels.shoulder : feels.landscape;
  }

  /** The distinct feels an environment can put under a wheel: one voice each, for the sound. */
  palette(environment: EnvironmentId): readonly SurfaceFeel[] {
    return [...new Set(this.of(environment).map((query: SurfaceQuery) => this.feel(query)))];
  }

  /** Every rank of an environment with the query that names it: road 1 to 3, then the rest. */
  of(environment: EnvironmentId): readonly SurfaceQuery[] {
    const zones: readonly Zone[] = ['road', 'shoulder', 'landscape'];
    return zones.flatMap((zone: Zone) =>
      this.ranks(environment, zone).map((_: SurfaceFeel, index: number) => ({
        environment,
        zone,
        rank: index + 1,
      })),
    );
  }
}
