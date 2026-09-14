import { Injectable } from '@angular/core';
import { type EnvironmentId, type Zone } from '@hexrace/tile';

import { type SurfaceFeel, type SurfaceQuery } from '@car/entity/surface-feel';
import { type SurfaceRanks } from '@car/entity/surface-ranks';
import { SURFACE_CATALOG } from '@car/entity/surfaces/surface-catalog';

/**
 * The per-surface table, and it lives here (technical spec 4.2): `tile` knows a rank and a
 * colour, the car knows what that rank does to a tyre. A query gives the environment, the zone
 * and the rank, 1 first; out of range ranks fall back on the first, so a malformed tile still
 * drives. `of` lists an environment's eight ranks in the order of the palette, for the panel.
 */
@Injectable({ providedIn: 'root' })
export class Surfaces {
  feel(query: SurfaceQuery): SurfaceFeel {
    const ranks = this.ranks(query.environment, query.zone);
    return ranks[query.rank - 1] ?? ranks[0];
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
