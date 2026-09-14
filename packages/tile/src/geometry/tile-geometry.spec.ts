import { TestBed } from '@angular/core/testing';
import { Polygons, Vec2 } from '@hexrace/commons';

import { EXIT_FACES } from '@tile/entity/face';
import { type Heading } from '@tile/entity/grid';
import { APOTHEM, SIDE } from '@tile/entity/layout';
import { NARROW_RIGHT_DARK, NO_SHOULDERS, WIDE_LEFT } from '@tile/entity/profile.mock';
import { type SPoint, type Slice } from '@tile/entity/slice';
import { type TileSweep } from '@tile/entity/sweep';
import { type ZonePolygon, type ZoneQuad } from '@tile/entity/zone';
import { sweepOf } from '@tile/entity/sweep.mock';
import { Layout } from '@tile/geometry/layout';
import { TileGeometry } from '@tile/geometry/tile-geometry';
import { TileSweeper } from '@tile/geometry/tile-sweeper';

const HEX_AREA = ((3 * Math.sqrt(3)) / 2) * SIDE * SIDE;
const HEADINGS: Heading[] = [0, 1, 2, 3, 4, 5];

describe('TileGeometry', () => {
  let geometry: TileGeometry;
  let layout: Layout;
  let polygons: Polygons;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    geometry = TestBed.inject(TileGeometry);
    layout = TestBed.inject(Layout);
    polygons = TestBed.inject(Polygons);
  });

  const area = (points: readonly SPoint[]): number =>
    Math.abs(polygons.area(points.map((p: SPoint) => p.at)));

  it('covers the hexagon exactly, for every exit and heading, with a transition', () => {
    for (const heading of HEADINGS) {
      for (const exit of EXIT_FACES) {
        const sweep = sweepOf({
          center: layout.cellToWorld({ q: 1, r: -2 }),
          heading,
          exit,
          entry: WIDE_LEFT,
          exitProfile: NARROW_RIGHT_DARK,
          transition: { start: 0, end: 1 },
        });
        const total = geometry
          .polygons(sweep, 48)
          .reduce((sum: number, p: ZonePolygon) => sum + area(p.points), 0);
        expect(Math.abs(total - HEX_AREA) / HEX_AREA).toBeLessThan(0.003);
      }
    }
  });

  it('carries the entry types on the first half and the exit types on the second', () => {
    const sweep = sweepOf({ entry: WIDE_LEFT, exitProfile: NARROW_RIGHT_DARK });
    const shapes = geometry.polygons(sweep);
    const landscapes = shapes.filter((p: ZonePolygon) => p.zone === 'landscape');
    expect(landscapes.map((p: ZonePolygon) => [p.side, p.type])).toEqual([
      ['left', 1],
      ['right', 1],
      ['left', 2],
      ['right', 2],
    ]);
    expect(
      shapes.filter((p: ZonePolygon) => p.zone === 'road').map((p: ZonePolygon) => p.type),
    ).toEqual([1, 3]);
    const shoulders = shapes.filter((p: ZonePolygon) => p.zone === 'shoulder');
    expect(shoulders.map((p: ZonePolygon) => [p.side, p.type])).toEqual([
      ['left', 2],
      ['right', 2],
      ['left', 2],
      ['right', 2],
    ]);
  });

  it('emits no shoulder when neither face has one, in quads and polygons', () => {
    const sweep = sweepOf({ exit: 2, entry: NO_SHOULDERS });
    expect(geometry.polygons(sweep).filter((p: ZonePolygon) => p.zone === 'shoulder')).toHaveLength(
      0,
    );
    expect(geometry.quads(sweep).filter((q: ZoneQuad) => q.zone === 'shoulder')).toHaveLength(0);
    expect(geometry.quads(sweep).every((q: ZoneQuad) => q.points.length === 4)).toBe(true);
  });

  it('switches the quads to the exit types past the middle and keeps each on two slices', () => {
    const sweep = sweepOf({ exit: 2, entry: WIDE_LEFT, exitProfile: NARROW_RIGHT_DARK });
    const quads = geometry.quads(sweep);
    for (const quad of quads) {
      expect([...new Set(quad.points.map((p: SPoint) => p.s))]).toHaveLength(2);
    }
    const roads = quads.filter((q: ZoneQuad) => q.zone === 'road');
    expect(roads[0]?.type).toBe(1);
    expect(roads.at(-1)?.type).toBe(3);
    expect(
      quads.filter((q: ZoneQuad) => q.zone === 'landscape' && q.type === 2).length,
    ).toBeGreaterThan(0);
  });

  it('leaves a tiny gap at the shared corner of a sharp turn, never the corner itself', () => {
    const sweep = sweepOf({ exit: 4, entry: WIDE_LEFT });
    const vertex = new Vec2(4, -APOTHEM);
    const inner = geometry
      .polygons(sweep, 8)
      .filter((p: ZonePolygon) => p.zone === 'landscape' && p.side === 'right');
    expect(inner.length).toBeGreaterThan(0);
    for (const poly of inner) {
      for (const p of poly.points) {
        expect(p.at.distanceTo(vertex)).toBeGreaterThan(geometry.apexRadius - 1e-9);
      }
    }
    geometry.apexRadius = 0.5;
    const wider = geometry
      .polygons(sweep, 8)
      .filter((p: ZonePolygon) => p.zone === 'landscape' && p.side === 'right');
    const nearest = Math.min(
      ...wider.flatMap((p: ZonePolygon) => p.points.map((q: SPoint) => q.at.distanceTo(vertex))),
    );
    expect(nearest).toBeGreaterThan(0.5 - 1e-9);
    const left: TileSweep = { ...sweep, exit: 8 };
    const leftVertex = new Vec2(-4, -APOTHEM);
    for (const p of geometry.boundary(left)) {
      expect(p.at.distanceTo(leftVertex)).toBeGreaterThan(0.5 - 1e-9);
    }
  });

  it('follows the hexagon exactly with its boundary, corners included', () => {
    for (const exit of EXIT_FACES) {
      const sweep = sweepOf({ heading: 2, exit, entry: WIDE_LEFT, exitProfile: NARROW_RIGHT_DARK });
      const boundary = geometry.boundary(sweep);
      expect(Math.abs(area(boundary) - HEX_AREA) / HEX_AREA).toBeLessThan(1e-4);
      for (const p of boundary) expect(p.at.length()).toBeLessThanOrEqual(SIDE + 1e-6);
    }
  });

  it('takes its slice count from the exit kind, or from the caller', () => {
    const sweep = (exit: TileSweep['exit']): TileSweep => sweepOf({ exit, entry: WIDE_LEFT });
    expect(geometry.samples).toEqual({ straight: 24, wide: 36, sharp: 48 });
    expect(geometry.slices(sweep(12)).length).toBeGreaterThanOrEqual(25);
    expect(geometry.slices(sweep(2)).length).toBeGreaterThanOrEqual(37);
    expect(geometry.slices(sweep(4)).length).toBeGreaterThanOrEqual(49);
    expect(geometry.slices(sweep(12), 4).length).toBeLessThan(12);
    geometry.samples.straight = 2;
    expect(geometry.slices(sweep(12)).length).toBeLessThan(10);
    expect(geometry.slices(sweep(12)).some((sl: Slice) => sl.s === 0.5)).toBe(true);
  });

  it('reads a slice point height from the sweeper', () => {
    const sweep = sweepOf({ entry: WIDE_LEFT, exitProfile: NARROW_RIGHT_DARK });
    const point: SPoint = { at: Vec2.ZERO, s: 0.3 };
    expect(geometry.heightOf(sweep, point)).toBe(TestBed.inject(TileSweeper).heightOfS(sweep, 0.3));
  });
});
