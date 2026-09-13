import { Injectable } from '@angular/core';

import { createRng, type Rng } from '@commons/random/rng';

/**
 * Where randomness comes from, so a test can replace it. `seeded` is for what must replay (a
 * generated track, a daily challenge); `fresh` for what only has to look random (a particle, a
 * misfire) and takes its seed from the clock and `Math.random`, the only place the game reads them.
 */
@Injectable({ providedIn: 'root' })
export class Random {
  seeded(seed: string): Rng {
    return createRng(seed);
  }

  fresh(): Rng {
    // eslint-disable-next-line sonarjs/pseudo-random -- a seed for effects, nothing secure about it.
    return createRng(`${String(Date.now())}:${String(Math.random())}`);
  }
}
