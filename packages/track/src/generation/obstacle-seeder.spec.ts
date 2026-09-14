import { TestBed } from '@angular/core/testing';
import { Random, type Rng, Vec2 } from '@hexrace/commons';
import { type ExitFace, type Obstacle, type TileSweep } from '@hexrace/tile';

import { type Dials } from '@track/entity/generation';
import { ObstacleSeeder } from '@track/generation/obstacle-seeder';

const NONE: Dials = { turning: 0, sharpness: 0, relief: 0, variety: 0, obstacles: 0 };
const ALL: Dials = { ...NONE, obstacles: 1 };

function sweepOf(exit: ExitFace): TileSweep {
  const profile = {
    position: 2,
    roadWidth: 3,
    leftShoulder: 1 as const,
    rightShoulder: 1 as const,
    height: 20,
    road: 1 as const,
    shoulder: 1 as const,
    landscape: 1 as const,
  };
  return { center: Vec2.ZERO, heading: 0, exit, entry: profile, exitProfile: profile };
}

describe('ObstacleSeeder', () => {
  let seeder: ObstacleSeeder;
  let random: Random;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    seeder = TestBed.inject(ObstacleSeeder);
    random = TestBed.inject(Random);
  });

  function harvest(exit: ExitFace, count: number): Obstacle[] {
    const found: Obstacle[] = [];
    for (let i = 0; i < count; i++) {
      const rng: Rng = random.seeded(`seed-${String(exit)}-${String(i)}`);
      found.push(...seeder.make(rng, ALL, sweepOf(exit)));
    }
    return found;
  }

  it('seeds nothing when the density dial is at zero', () => {
    expect(seeder.make(random.seeded('x'), NONE, sweepOf(12))).toEqual([]);
  });

  it('draws every kind of obstacle on a straight', () => {
    const kinds = [...new Set(harvest(12, 300).map((o: Obstacle) => o.kind))];
    kinds.sort((a: string, b: string) => a.localeCompare(b));
    expect(kinds).toEqual(['barrier', 'bump', 'hazard', 'patch', 'ramp']);
  });

  it('never ramps in a turn and puts the barrier on the outside', () => {
    const right = harvest(2, 200);
    expect(right.some((o: Obstacle) => o.kind === 'ramp')).toBe(false);
    expect(
      right.filter((o: Obstacle) => o.kind === 'barrier').every((o) => o.side === 'left'),
    ).toBe(true);
    const left = harvest(10, 200);
    expect(
      left.filter((o: Obstacle) => o.kind === 'barrier').every((o) => o.side === 'right'),
    ).toBe(true);
  });

  it('drops a candidate that would spill out of its tile', () => {
    const spread = harvest(4, 300);
    expect(spread.length).toBeGreaterThan(0);
    expect(spread.length).toBeLessThan(300);
  });
});
