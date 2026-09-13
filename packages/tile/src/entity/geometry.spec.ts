import { TestBed } from '@angular/core/testing';

import { EXIT_FACES } from '@tile/entity/face';
import {
  type SPoint,
  type Slice,
  type ZonePolygon,
  type ZoneQuad,
  HEX_AREA,
  TileGeometry,
  polygonArea,
} from '@tile/entity/geometry';
import { type Heading } from '@tile/entity/grid';
import { APOTHEM, SIDE, cellToWorld } from '@tile/entity/layout';
import { type Profile } from '@tile/entity/profile';
import { type TileSweep, TileSweeper } from '@tile/entity/sweep';

const wideLeft: Profile = {
  position: 1,
  roadWidth: 4,
  leftShoulder: 0,
  rightShoulder: 1,
  height: 3,
  road: 1,
  shoulder: 2,
  landscape: 1,
};
const narrowRight: Profile = {
  ...wideLeft,
  position: 5,
  roadWidth: 1,
  leftShoulder: 1,
  rightShoulder: 1,
  road: 3,
};
const otherLandscape: Profile = { ...narrowRight, landscape: 2 };

let geometry: TileGeometry;

beforeEach(() => {
  TestBed.configureTestingModule({});
  geometry = TestBed.inject(TileGeometry);
});

describe('samples', () => {
  it.each([
    [12, 24],
    [2, 36],
    [10, 36],
    [4, 48],
    [8, 48],
  ] as const)('cuts exit %d into %d slices by default', (exit, samples) => {
    const sweep: TileSweep = {
      center: { x: 0, y: 0 },
      heading: 0,
      exit,
      entry: wideLeft,
      exitProfile: wideLeft,
    };
    expect(geometry.slices(sweep).length).toBeGreaterThanOrEqual(samples + 1);
    geometry.samples.straight = 4;
    geometry.samples.wide = 4;
    geometry.samples.sharp = 4;
    expect(geometry.slices(sweep).length).toBeLessThan(samples + 1);
  });
});

describe('polygons', () => {
  it('covers the hexagon exactly, for every exit and heading, with a transition', () => {
    for (let h = 0; h < 6; h++) {
      for (const exit of EXIT_FACES) {
        const sweep: TileSweep = {
          center: cellToWorld({ q: 1, r: -2 }),
          heading: h as Heading,
          exit,
          entry: wideLeft,
          exitProfile: narrowRight,
          transition: { start: 0, end: 1 },
        };
        const total = geometry
          .polygons(sweep, 48)
          .reduce((sum: number, p: ZonePolygon) => sum + Math.abs(polygonArea(p.points)), 0);
        expect(Math.abs(total - HEX_AREA) / HEX_AREA).toBeLessThan(0.003);
      }
    }
  });

  it('carries the entry types on the first half and the exit types on the second', () => {
    const sweep: TileSweep = {
      center: { x: 0, y: 0 },
      heading: 0,
      exit: 12,
      entry: wideLeft,
      exitProfile: otherLandscape,
    };
    const landscapes = geometry.polygons(sweep).filter((p: ZonePolygon) => p.zone === 'landscape');
    expect(landscapes.map((p: ZonePolygon) => [p.side, p.type])).toEqual([
      ['left', 1],
      ['right', 1],
      ['left', 2],
      ['right', 2],
    ]);
    const roads = geometry.polygons(sweep).filter((p: ZonePolygon) => p.zone === 'road');
    expect(roads.map((p: ZonePolygon) => p.type)).toEqual([1, 3]);
    const shoulders = geometry.polygons(sweep).filter((p: ZonePolygon) => p.zone === 'shoulder');
    expect(shoulders).toHaveLength(4);
    expect(shoulders.map((p: ZonePolygon) => p.side)).toEqual(['left', 'right', 'left', 'right']);
  });

  it('emits no shoulder when neither the entry nor the exit has one', () => {
    const none: Profile = { ...wideLeft, position: 2, leftShoulder: 0, rightShoulder: 0 };
    const sweep: TileSweep = {
      center: { x: 0, y: 0 },
      heading: 0,
      exit: 2,
      entry: none,
      exitProfile: none,
    };
    expect(geometry.polygons(sweep).filter((p: ZonePolygon) => p.zone === 'shoulder')).toHaveLength(
      0,
    );
    expect(geometry.quads(sweep).filter((q: ZoneQuad) => q.zone === 'shoulder')).toHaveLength(0);
  });

  it('leaves a tiny hole at the shared corner of a sharp turn, never the corner itself', () => {
    const sweep: TileSweep = {
      center: { x: 0, y: 0 },
      heading: 0,
      exit: 4,
      entry: wideLeft,
      exitProfile: wideLeft,
    };
    const vertex = { x: 4, y: -APOTHEM };
    const inner = geometry
      .polygons(sweep, 8)
      .filter((p: ZonePolygon) => p.zone === 'landscape' && p.side === 'right');
    expect(inner.length).toBeGreaterThan(0);
    for (const poly of inner) {
      for (const p of poly.points) {
        expect(Math.hypot(p.x - vertex.x, p.y - vertex.y)).toBeGreaterThan(
          geometry.apexRadius - 1e-9,
        );
      }
    }
    geometry.apexRadius = 0.5;
    for (const poly of geometry.polygons(sweep, 8).filter((p: ZonePolygon) => p.side === 'right')) {
      for (const p of poly.points) {
        expect(Math.hypot(p.x - vertex.x, p.y - vertex.y)).toBeGreaterThan(0.5 - 1e-9);
      }
    }
    geometry.apexRadius = 0.01;
    const left: TileSweep = { ...sweep, exit: 8 };
    const leftVertex = { x: -4, y: -APOTHEM };
    for (const poly of geometry.polygons(left, 8).filter((p: ZonePolygon) => p.side === 'left')) {
      for (const p of poly.points) {
        expect(Math.hypot(p.x - leftVertex.x, p.y - leftVertex.y)).toBeGreaterThan(
          geometry.apexRadius - 1e-9,
        );
      }
    }
  });
});

describe('boundary', () => {
  it('follows the hexagon exactly, corners included, for every exit', () => {
    for (const exit of EXIT_FACES) {
      const sweep: TileSweep = {
        center: { x: 0, y: 0 },
        heading: 2,
        exit,
        entry: wideLeft,
        exitProfile: narrowRight,
      };
      const boundary = geometry.boundary(sweep);
      expect(Math.abs(Math.abs(polygonArea(boundary)) - HEX_AREA) / HEX_AREA).toBeLessThan(1e-4);
      for (const p of boundary) expect(Math.hypot(p.x, p.y)).toBeLessThanOrEqual(SIDE + 1e-6);
    }
  });
});

describe('slices and quads', () => {
  const sweep: TileSweep = {
    center: { x: 0, y: 0 },
    heading: 0,
    exit: 2,
    entry: wideLeft,
    exitProfile: narrowRight,
  };

  it('puts every point of a slice at one s, and every quad between two neighbouring slices', () => {
    for (const slice of geometry.slices(sweep)) {
      const points = [
        slice.outerLeft,
        slice.blockLeft,
        slice.roadLeft,
        slice.roadRight,
        slice.blockRight,
        slice.outerRight,
      ];
      expect(points.every((p) => p.s === slice.s)).toBe(true);
    }
    for (const quad of geometry.quads(sweep)) {
      expect([...new Set(quad.points.map((p: SPoint) => p.s))]).toHaveLength(2);
    }
  });

  it('sorts the slices, includes both faces and the middle, and never repeats an s', () => {
    const values = geometry.slices(sweep).map((sl: Slice) => sl.s);
    expect(values[0]).toBe(0);
    expect(values.at(-1)).toBe(1);
    expect(values).toContain(0.5);
    expect([...new Set(values)]).toHaveLength(values.length);
    expect([...values].sort((a, b) => a - b)).toEqual(values);
  });

  it('reads a slice point height from its s', () => {
    const slice = geometry.slices(sweep)[3]!;
    expect(geometry.heightOf(sweep, slice.roadLeft)).toBe(
      TestBed.inject(TileSweeper).heightOfS(sweep, slice.s),
    );
  });
});

describe('polygonArea', () => {
  it('is positive counter-clockwise and negative clockwise', () => {
    const square = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ];
    expect(polygonArea(square)).toBe(1);
    expect(polygonArea([...square].reverse())).toBe(-1);
  });
});
