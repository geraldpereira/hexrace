import { Injectable, inject } from '@angular/core';
import { EnvironmentCatalog } from '@hexrace/tile';
import { clamp } from 'lodash-es';

import { type Dials, type GeneratorConfig, MAX_GENERATED_TILES } from '@track/entity/generation';

const PATTERN = /^([a-z]+):([A-Za-z0-9_-]+):t(\d)s(\d)r(\d)v(\d)o(\d):n(\d+)$/;

/**
 * The generator setting as one string (functional spec 5.3), for instance
 * `europe:hexrace:t5s3r4v4o3:n30`: the environment, the seed, five dials from 0 to 9 (t turning,
 * s sharpness, r relief, v variety, o obstacles) and the number of tiles. The same string always
 * gives the same track, which is what makes a daily challenge possible.
 */
@Injectable({ providedIn: 'root' })
export class GeneratorConfigs {
  private readonly environments = inject(EnvironmentCatalog);

  format(config: GeneratorConfig): string {
    const d = config.dials;
    const dials = `t${String(d.turning)}s${String(d.sharpness)}r${String(d.relief)}v${String(d.variety)}o${String(d.obstacles)}`;
    return `${config.environment}:${config.seed}:${dials}:n${String(config.length)}`;
  }

  parse(text: string): GeneratorConfig | null {
    const m = PATTERN.exec(text.trim());
    if (!m) return null;
    const [, environment, seed, turning, sharpness, relief, variety, obstacles, count] = m;
    if (!this.environments.isId(environment!)) return null;
    const length = Number(count);
    if (length < 1 || length > MAX_GENERATED_TILES) return null;
    return {
      environment,
      seed: seed!,
      dials: {
        turning: Number(turning),
        sharpness: Number(sharpness),
        relief: Number(relief),
        variety: Number(variety),
        obstacles: Number(obstacles),
      },
      length,
    };
  }

  /** The dials brought from 0 to 9 down to 0 to 1, the shape the generator reasons with. */
  normalize(dials: Dials): Dials {
    return {
      turning: clamp(dials.turning, 0, 9) / 9,
      sharpness: clamp(dials.sharpness, 0, 9) / 9,
      relief: clamp(dials.relief, 0, 9) / 9,
      variety: clamp(dials.variety, 0, 9) / 9,
      obstacles: clamp(dials.obstacles, 0, 9) / 9,
    };
  }
}
