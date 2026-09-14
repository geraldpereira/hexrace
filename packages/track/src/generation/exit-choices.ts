import { Injectable, inject } from '@angular/core';
import { type Rng } from '@hexrace/commons';
import { type ExitFace, type Pose, EXIT_FACES, Faces, Grid } from '@hexrace/tile';

import { type Dials } from '@track/entity/generation';

/** Everything the choice of an exit depends on; the dials are the normalised ones, 0 to 1. */
export interface ExitQuery {
  readonly rng: Rng;
  readonly dials: Dials;
  readonly pose: Pose;
  readonly occupied: ReadonlySet<string>;
  readonly sharpRun: number;
  readonly maxSharpRun: number;
  readonly straightOnly: boolean;
  readonly noSharp: boolean;
}

/**
 * The exits open from a pose, drawn in an order the dials weight: cells already taken are out, so
 * are cells every exit of which is blocked, and an exit of zero weight is left out rather than
 * ranked last, so that running out of candidates means backtracking (functional spec 5.5).
 */
@Injectable({ providedIn: 'root' })
export class ExitChoices {
  private readonly faces = inject(Faces);
  private readonly grid = inject(Grid);

  ranked(query: ExitQuery): ExitFace[] {
    const pool = this.free(query).filter((exit: ExitFace) => this.weight(query, exit) > 0);
    const ranked: ExitFace[] = [];
    while (pool.length > 0) {
      const chosen = query.rng.weighted(pool, (exit: ExitFace) => this.weight(query, exit));
      if (chosen === undefined) break;
      ranked.push(chosen);
      pool.splice(pool.indexOf(chosen), 1);
    }
    return ranked;
  }

  private free(query: ExitQuery): ExitFace[] {
    return EXIT_FACES.filter((exit: ExitFace) => {
      const heading = this.grid.exitHeading(query.pose.heading, exit);
      const cell = this.grid.neighbor(query.pose.cell, heading);
      if (query.occupied.has(this.grid.key(cell))) return false;
      return EXIT_FACES.some(
        (next: ExitFace) =>
          !query.occupied.has(
            this.grid.key(this.grid.neighbor(cell, this.grid.exitHeading(heading, next))),
          ),
      );
    });
  }

  private weight(query: ExitQuery, exit: ExitFace): number {
    const turn = Math.abs(this.faces.turnOf(exit));
    const { turning, sharpness } = query.dials;
    if (query.straightOnly && turn !== 0) return 0;
    if (query.noSharp && turn === 2) return 0;
    if (turn === 0) return 1 - turning + 0.05;
    if (turn === 1) return turning === 0 ? 0 : (turning * (1 - sharpness)) / 2 + 0.02;
    return query.sharpRun >= query.maxSharpRun ? 0 : (turning * sharpness) / 2;
  }
}
