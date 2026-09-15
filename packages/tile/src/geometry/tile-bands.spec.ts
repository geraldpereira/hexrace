import { TestBed } from '@angular/core/testing';
import { Polygons, Vec3 } from '@hexrace/commons';

import { BUMP, LEFT_BARRIER, RAMP, RIGHT_BARRIER } from '@tile/entity/obstacle.mock';
import { type Barrier } from '@tile/entity/obstacles/barrier';
import { type RoadBand } from '@tile/entity/obstacles/road-band';
import { type SPoint } from '@tile/entity/slice';
import { type ExitFace } from '@tile/entity/face';
import { type TileSweep } from '@tile/entity/sweep';
import { sweepOf } from '@tile/entity/sweep.mock';
import { type Triangle3 } from '@tile/entity/triangle';
import { TileBands } from '@tile/geometry/tile-bands';
import { TileObstacles } from '@tile/geometry/tile-obstacles';
import { TileSweeper } from '@tile/geometry/tile-sweeper';
import { Units } from '@tile/geometry/units';

const straight = sweepOf();
const GROUND = 5 * 0.2;

const normal = (t: Triangle3): Vec3 => t.b.sub(t.a).cross(t.c.sub(t.a));
const centre = (t: Triangle3): Vec3 =>
  t.a
    .add(t.b)
    .add(t.c)
    .scale(1 / 3);
const flat = (v: Vec3): Vec3 => new Vec3(v.x, 0, v.z);
const unit = (v: Vec3): Vec3 => (v.length() === 0 ? v : v.scale(1 / v.length()));

const sideOf = (list: readonly Triangle3[], face: 'top' | 'side'): Triangle3[] =>
  list.filter((t: Triangle3) => t.paint.kind === 'obstacle' && t.paint.face === face);

const toSegment = (p: Vec3, a: Vec3, b: Vec3): number => {
  const ab = flat(b.sub(a));
  const length = ab.dot(ab);
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, flat(p.sub(a)).dot(ab) / length));
  return flat(p.sub(a.add(ab.scale(t)))).length();
};

const toMidline = (p: Vec3, midline: readonly Vec3[]): number => {
  let best = Infinity;
  for (let i = 0; i + 1 < midline.length; i++)
    best = Math.min(best, toSegment(p, midline[i]!, midline[i + 1]!));
  return best;
};

describe('TileBands', () => {
  let bands: TileBands;
  let obstacles: TileObstacles;
  let sweeper: TileSweeper;
  let units: Units;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    bands = TestBed.inject(TileBands);
    obstacles = TestBed.inject(TileObstacles);
    sweeper = TestBed.inject(TileSweeper);
    units = TestBed.inject(Units);
  });

  const heightAt = (sweep: TileSweep) => (p: SPoint) => sweeper.heightOfS(sweep, p.s);

  const midline = (sweep: TileSweep, obstacle: Barrier | RoadBand): Vec3[] => {
    const { body } = obstacles.footprint(sweep, obstacle);
    return obstacles.slices(body).map(([l, r]: [SPoint, SPoint]) => {
      const mid = l.at.add(r.at).scale(0.5);
      return units.toWorld(mid, sweeper.heightOfS(sweep, l.s));
    });
  };

  it('stands a barrier one metre high over its whole length, top and walls', () => {
    const list = bands.build(straight, RIGHT_BARRIER, heightAt(straight));
    const tops = sideOf(list, 'top');
    expect(tops.length).toBeGreaterThan(0);
    for (const t of tops) expect(t.a.y).toBeCloseTo(GROUND + 1, 6);
    for (const t of tops) expect(normal(t).y).toBeGreaterThan(0);
    expect(sideOf(list, 'side').length).toBeGreaterThan(0);
    expect(
      list.every((t: Triangle3) => t.paint.kind === 'obstacle' && t.paint.obstacle === 'barrier'),
    ).toBe(true);
  });

  it.each([4, 8] as ExitFace[])(
    'winds every wall of a barrier outwards in a 120° turn (exit %i)',
    (exit) => {
      const sweep = sweepOf({ exit });
      for (const barrier of [LEFT_BARRIER, RIGHT_BARRIER]) {
        const list = bands.build(sweep, barrier, heightAt(sweep));
        const axis = midline(sweep, barrier);
        for (const t of sideOf(list, 'side')) {
          const away = unit(flat(normal(t)));
          const here = toMidline(centre(t), axis);
          const there = toMidline(centre(t).add(away.scale(0.01)), axis);
          expect(there).toBeGreaterThan(here);
        }
      }
    },
  );

  it('would wind some wall of a left barrier inwards from the contour’s centroid', () => {
    const sweep = sweepOf({ exit: 8 });
    const { body } = obstacles.footprint(sweep, LEFT_BARRIER);
    const polygons = TestBed.inject(Polygons);
    const hub = units.toWorld(polygons.centroid(body.map((p: SPoint) => p.at)), 0);
    const walls = sideOf(bands.build(sweep, LEFT_BARRIER, heightAt(sweep)), 'side');
    expect(walls.some((t: Triangle3) => flat(normal(t)).dot(flat(centre(t).sub(hub))) <= 0)).toBe(
      true,
    );
  });

  it('climbs a ramp from the ground to its full height and drops it back at the end', () => {
    const ramp: RoadBand = RAMP;
    const list = bands.build(straight, ramp, heightAt(straight));
    const ys = list.flatMap((t: Triangle3) => [t.a.y, t.b.y, t.c.y]);
    expect(Math.min(...ys)).toBeCloseTo(GROUND, 6);
    expect(Math.max(...ys)).toBeCloseTo(GROUND + 0.8, 6);
    expect(bands.liftAt(ramp, 0)).toBe(0);
    expect(units.unitsToMeters(bands.liftAt(ramp, 0.5))).toBeCloseTo(0.4, 12);
    const back = sideOf(list, 'side').filter(
      (t: Triangle3) => Math.max(t.a.y, t.b.y, t.c.y) > GROUND + 0.7,
    );
    expect(back.length).toBeGreaterThan(0);
  });

  it('rounds a bump to its full height at the middle and back to the ground at both ends', () => {
    const list = bands.build(straight, BUMP, heightAt(straight));
    const ys = list.flatMap((t: Triangle3) => [t.a.y, t.b.y, t.c.y]);
    expect(Math.max(...ys)).toBeCloseTo(GROUND + 0.3, 6);
    expect(bands.liftAt(BUMP, 0)).toBeCloseTo(0, 12);
    expect(bands.liftAt(BUMP, 1)).toBeCloseTo(0, 12);
    expect(units.unitsToMeters(bands.liftAt(BUMP, 0.5))).toBeCloseTo(0.3, 12);
    expect(units.unitsToMeters(bands.liftAt(BUMP, 0.25))).toBeCloseTo(0.15, 12);
  });

  it('follows its knobs', () => {
    bands.barrierHeight = 2;
    bands.rampHeight = 1.6;
    bands.bumpHeight = 0.6;
    expect(units.unitsToMeters(bands.liftAt(RIGHT_BARRIER, 0.5))).toBeCloseTo(2, 12);
    expect(units.unitsToMeters(bands.liftAt(RAMP, 1))).toBeCloseTo(1.6, 12);
    expect(units.unitsToMeters(bands.liftAt(BUMP, 0.5))).toBeCloseTo(0.6, 12);
  });
});
