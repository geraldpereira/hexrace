import { Injectable, inject } from '@angular/core';

import { type Rng } from '@commons/random/rng';
import { RngFactory } from '@commons/random/rng-factory';

/**
 * Where randomness comes from, so a test can replace it. `seeded` is for what must replay (a
 * generated track, a daily challenge); `fresh` for what only has to look random (a particle, a
 * misfire) and takes its seed from the clock and `Math.random`, the only place the game reads them.
 */
@Injectable({ providedIn: 'root' })
export class Random {
  private readonly factory = inject(RngFactory);

  seeded(seed: string): Rng {
    return this.factory.create(seed);
  }

  fresh(): Rng {
    // eslint-disable-next-line sonarjs/pseudo-random -- a seed for effects, nothing secure about it.
    return this.factory.create(`${String(Date.now())}:${String(Math.random())}`);
  }
}
