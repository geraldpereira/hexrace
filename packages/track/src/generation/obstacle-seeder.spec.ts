import { TestBed } from '@angular/core/testing';
import { Random, type Rng } from '@hexrace/commons';
import {
  type Hazard,
  type Obstacle,
  type SPoint,
  type TileSweep,
  TileObstacles,
  TileSweeper,
} from '@hexrace/tile';

import { type Dials } from '@track/entity/generation';
import { ObstacleSeeder } from '@track/generation/obstacle-seeder';
import {
  LEFT_SHOULDER_ROAD,
  ONE_UNIT_ROAD,
  STANDARD_ROAD,
  TWO_UNIT_ROAD,
  WIDE_ROAD,
  roadSweep,
} from '@track/generation/sweeps.mock';

const NONE: Dials = { turning: 0, sharpness: 0, relief: 0, variety: 0, obstacles: 0 };
const ALL: Dials = { ...NONE, obstacles: 1 };

describe('ObstacleSeeder', () => {
  let seeder: ObstacleSeeder;
  let random: Random;
  let sweeper: TileSweeper;
  let footprints: TileObstacles;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    seeder = TestBed.inject(ObstacleSeeder);
    random = TestBed.inject(Random);
    sweeper = TestBed.inject(TileSweeper);
    footprints = TestBed.inject(TileObstacles);
  });

  function harvest(sweep: TileSweep, count: number): Obstacle[] {
    const width = String(sweep.exitProfile.roadWidth + sweep.exitProfile.leftShoulder);
    const found: Obstacle[] = [];
    for (let i = 0; i < count; i++) {
      const rng: Rng = random.seeded(`seed-${width}-${String(sweep.exit)}-${String(i)}`);
      found.push(...seeder.make(rng, ALL, sweep));
    }
    return found;
  }

  function hazards(sweep: TileSweep, count: number): Hazard[] {
    return harvest(sweep, count).filter((o: Obstacle): o is Hazard => o.kind === 'hazard');
  }

  function passages(sweep: TileSweep, hazard: Hazard): number[] {
    const bounds = sweeper.boundariesAt(sweep, hazard.at);
    const half = bounds.roadLeft.distanceTo(bounds.roadRight) / 2;
    const across = footprints
      .footprint(sweep, hazard)
      .outline.map((p: SPoint) => p.at.sub(bounds.center).dot(bounds.right));
    return [
      Math.max(0, Math.min(Math.min(...across), half) + half),
      Math.max(0, half - Math.max(Math.max(...across), -half)),
    ];
  }

  it('seeds nothing when the density dial is at zero', () => {
    expect(seeder.make(random.seeded('x'), NONE, roadSweep(STANDARD_ROAD))).toEqual([]);
  });

  it('draws every kind of obstacle on a straight', () => {
    const kinds = [...new Set(harvest(roadSweep(STANDARD_ROAD), 300).map((o: Obstacle) => o.kind))];
    kinds.sort((a: string, b: string) => a.localeCompare(b));
    expect(kinds).toEqual(['barrier', 'bump', 'hazard', 'patch', 'ramp']);
  });

  it('never ramps in a turn and puts the barrier on the outside', () => {
    const right = harvest(roadSweep(STANDARD_ROAD, 2), 200);
    expect(right.some((o: Obstacle) => o.kind === 'ramp')).toBe(false);
    expect(right.filter((o: Obstacle) => o.kind === 'barrier').every((o) => o.side === 'left')).toBe(
      true,
    );
    const left = harvest(roadSweep(STANDARD_ROAD, 10), 200);
    expect(left.filter((o: Obstacle) => o.kind === 'barrier').every((o) => o.side === 'right')).toBe(
      true,
    );
  });

  it('drops a candidate that would spill out of its tile', () => {
    const spread = harvest(roadSweep(STANDARD_ROAD, 4), 300);
    expect(spread.length).toBeGreaterThan(0);
    expect(spread.length).toBeLessThan(300);
  });

  it('leaves a unit of road free on one side of every hazard, on every road and every seed', () => {
    const roads = [STANDARD_ROAD, TWO_UNIT_ROAD, WIDE_ROAD, LEFT_SHOULDER_ROAD];
    for (const road of roads) {
      for (const exit of [12, 2, 4] as const) {
        for (const sweep of [roadSweep(road, exit), roadSweep(road, exit, ONE_UNIT_ROAD)]) {
          for (const hazard of hazards(sweep, 200)) {
            const [left, right] = passages(sweep, hazard);
            expect(Math.max(left ?? 0, right ?? 0), JSON.stringify(hazard)).toBeGreaterThanOrEqual(
              1 - 1e-6,
            );
          }
        }
      }
    }
  });

  it('steps a hazard down rather than block a two-unit road', () => {
    const sweep = roadSweep(TWO_UNIT_ROAD);
    const drawn = hazards(sweep, 300);
    expect(drawn.length).toBeGreaterThan(0);
    expect(drawn.every((h: Hazard) => h.size !== 'large')).toBe(true);
    const offsets = [...new Set(drawn.map((h: Hazard) => h.offset))];
    offsets.sort((a: number, b: number) => a - b);
    expect(offsets).toEqual([-0.5, 0.5]);
  });

  it('seeds a patch instead of a hazard on a single lane without a shoulder', () => {
    const sweep = roadSweep(ONE_UNIT_ROAD);
    const drawn = harvest(sweep, 300);
    expect(drawn.some((o: Obstacle) => o.kind === 'patch')).toBe(true);
    expect(drawn.some((o: Obstacle) => o.kind === 'hazard')).toBe(false);
  });

  it('still lays large hazards on a wide road', () => {
    const drawn = hazards(roadSweep(WIDE_ROAD), 300);
    expect(drawn.some((h: Hazard) => h.size === 'large')).toBe(true);
    expect(drawn.some((h: Hazard) => h.offset === 0)).toBe(true);
  });

  it('puts a hazard on the left shoulder when only that side has one', () => {
    const drawn = hazards(roadSweep(LEFT_SHOULDER_ROAD), 300);
    expect(drawn.length).toBeGreaterThan(0);
    expect(drawn.every((h: Hazard) => h.offset === -1)).toBe(true);
    expect(drawn.every((h: Hazard) => h.size !== 'large')).toBe(true);
  });

  it('replays the same obstacle for the same seed', () => {
    const sweep = roadSweep(STANDARD_ROAD);
    const once = seeder.make(random.seeded('twice'), ALL, sweep);
    expect(seeder.make(random.seeded('twice'), ALL, sweep)).toEqual(once);
  });
});
