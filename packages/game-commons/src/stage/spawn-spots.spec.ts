import { TestBed } from '@angular/core/testing';
import { Vec2 } from '@hexrace/commons';
import { type Obstacle, type TileBuild, TilePaths, TileSweeper, UNIT_METERS } from '@hexrace/tile';

import { type SpawnPose } from '@game-commons/entity/spawn-pose';
import { SpawnSpots } from '@game-commons/stage/spawn-spots';
import { straightBuild } from '@game-commons/stage/tile-build.mock';

const BIG_HAZARD: Obstacle = { kind: 'hazard', size: 'large', at: 0.5, offset: 0 };

describe('SpawnSpots', () => {
  let spots: SpawnSpots;
  let paths: TilePaths;
  let sweeper: TileSweeper;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    spots = TestBed.inject(SpawnSpots);
    paths = TestBed.inject(TilePaths);
    sweeper = TestBed.inject(TileSweeper);
  });

  function on(build: TileBuild, pose: SpawnPose): { s: number; offset: number } {
    const p = new Vec2(pose.point.x / UNIT_METERS, -pose.point.z / UNIT_METERS);
    const sweep = build.sweep;
    const s = paths.axisParameter(sweep.center, sweep.heading, sweep.exit, p);
    const boundaries = sweeper.boundariesAt(sweep, s);
    return { s, offset: p.sub(boundaries.center).dot(boundaries.right) };
  }

  it('puts the car in the middle of the road on a tile that carries nothing', () => {
    const build = straightBuild();
    const pose = spots.pose(build, 0.5);
    const place = on(build, pose);
    expect(place.s).toBeCloseTo(0.5, 6);
    expect(place.offset).toBeCloseTo(0, 6);
    expect(pose.heading).toBeCloseTo(Math.PI, 6);
    expect(pose.point.y).toBeCloseTo(0, 6);
  });

  it('drives over a patch rather than stepping around it', () => {
    const patch: Obstacle = { kind: 'patch', from: 0, to: 1, offset: 0, width: 2, road: 2 };
    const place = on(straightBuild([patch]), spots.pose(straightBuild([patch]), 0.5));
    expect(place.s).toBeCloseTo(0.5, 6);
    expect(place.offset).toBeCloseTo(0, 6);
  });

  it('goes further down the axis when a hazard sits on the middle of a narrow road', () => {
    const build = straightBuild([BIG_HAZARD]);
    const place = on(build, spots.pose(build, 0.5));
    expect(place.offset).toBeCloseTo(0, 6);
    expect(place.s).toBeGreaterThan(0.6);
  });

  it('steps across a wide road instead, as far out as the car still fits on it', () => {
    const build = straightBuild([BIG_HAZARD], { roadWidth: 6, position: 1 });
    const place = on(build, spots.pose(build, 0.5));
    expect(place.s).toBeCloseTo(0.5, 6);
    expect(place.offset).toBeCloseTo(-1.5, 6);
  });

  it('never takes a place a barrier reserves, which lies off the road anyway', () => {
    const barrier: Obstacle = { kind: 'barrier', side: 'left', from: 0, to: 1 };
    const build = straightBuild([barrier, BIG_HAZARD], { roadWidth: 6, position: 1 });
    const place = on(build, spots.pose(build, 0.5));
    const half = 3 - 0.8 / UNIT_METERS;
    expect(Math.abs(place.offset)).toBeLessThanOrEqual(half);
  });

  it('clears a ramp that bars the road from side to side by going past it', () => {
    const ramp: Obstacle = { kind: 'ramp', from: 0.3, to: 0.7 };
    const build = straightBuild([ramp]);
    const place = on(build, spots.pose(build, 0.5));
    expect(place.s).toBeGreaterThan(0.7);
    expect(place.offset).toBeCloseTo(0, 6);
  });

  it('falls back on the point it was asked for when the whole tile is barred', () => {
    const ramp: Obstacle = { kind: 'ramp', from: 0, to: 1 };
    const build = straightBuild([ramp]);
    const place = on(build, spots.pose(build, 0.52));
    expect(place.s).toBeCloseTo(0.52, 6);
    expect(place.offset).toBeCloseTo(0, 6);
  });
});
