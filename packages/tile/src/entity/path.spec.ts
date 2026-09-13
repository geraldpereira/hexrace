import { EXIT_FACES } from '@tile/entity/face';
import { type Heading, exitHeading } from '@tile/entity/grid';
import {
  type Vec2,
  APOTHEM,
  SIDE,
  cellToWorld,
  entryFrame,
  exitFrame,
  facePoint,
} from '@tile/entity/layout';
import {
  DEFAULT_TRANSITION,
  axisParameter,
  lerpSpan,
  localAxisParameter,
  localPath,
  pathLength,
  profilePoint,
  rotate,
  transition,
  transitionOfExtent,
  unrotate,
  worldPath,
} from '@tile/entity/path';

const HEADINGS: readonly Heading[] = [0, 1, 2, 3, 4, 5];
const close = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;
const samePoint = (a: Vec2, b: Vec2): boolean => close(a.x, b.x) && close(a.y, b.y);

describe('axis of a tile', () => {
  it('starts at the middle of face 6 heading north, the right to the east', () => {
    for (const exit of EXIT_FACES) {
      const { point, travel, right } = localPath(exit, 0);
      expect(samePoint(point, { x: 0, y: -APOTHEM })).toBe(true);
      expect(samePoint(travel, { x: 0, y: 1 })).toBe(true);
      expect(samePoint(right, { x: 1, y: 0 })).toBe(true);
    }
  });

  it('ends at the middle of the exit face, in the exit direction, whatever the heading', () => {
    for (const heading of HEADINGS) {
      const center = cellToWorld({ q: 2, r: -1 });
      for (const exit of EXIT_FACES) {
        const out = exitFrame(center, exitHeading(heading, exit));
        const end = worldPath(center, heading, exit, 1);
        expect(samePoint(end.point, facePoint(out, SIDE / 2))).toBe(true);
        expect(samePoint(end.travel, out.travel)).toBe(true);
        expect(samePoint(profilePoint(end, 0), facePoint(out, 0))).toBe(true);
        const inn = entryFrame(center, heading);
        const begin = worldPath(center, heading, exit, 0);
        expect(samePoint(profilePoint(begin, SIDE), facePoint(inn, SIDE))).toBe(true);
      }
    }
  });

  it('keeps a constant speed along the axis', () => {
    for (const exit of EXIT_FACES) {
      const n = 50;
      let previous = localPath(exit, 0).point;
      const step = pathLength(exit) / n;
      for (let i = 1; i <= n; i++) {
        const { point } = localPath(exit, i / n);
        expect(
          Math.abs(Math.hypot(point.x - previous.x, point.y - previous.y) - step),
        ).toBeLessThan(step * 0.01);
        previous = point;
      }
    }
  });

  it('measures the straight, the wide turn and the sharp turn', () => {
    expect(close(pathLength(12), 2 * APOTHEM)).toBe(true);
    expect(close(pathLength(2), (12 * Math.PI) / 3)).toBe(true);
    expect(close(pathLength(8), (4 * 2 * Math.PI) / 3)).toBe(true);
  });

  it('shrinks the inner edge of a sharp turn to the shared corner', () => {
    const mid = localPath(4, 0.5);
    expect(samePoint(profilePoint(mid, SIDE), { x: SIDE / 2, y: -APOTHEM })).toBe(true);
    const left = localPath(8, 0.5);
    expect(samePoint(profilePoint(left, 0), { x: -SIDE / 2, y: -APOTHEM })).toBe(true);
  });

  it('rotates by whole turns and undoes it', () => {
    const v = { x: 1, y: 2 };
    expect(samePoint(rotate(v, 0), v)).toBe(true);
    expect(samePoint(rotate(v, 3), { x: -1, y: -2 })).toBe(true);
    for (const heading of HEADINGS) {
      expect(samePoint(unrotate(rotate(v, heading), heading), v)).toBe(true);
    }
  });
});

describe('transition', () => {
  it('happens in the middle of the tile only, by default', () => {
    expect(DEFAULT_TRANSITION).toEqual({ start: 0.3, end: 0.7 });
    expect(lerpSpan([1, 4], [3, 5], 0.2)).toEqual([1, 4]);
    expect(lerpSpan([1, 4], [3, 5], 0.5)).toEqual([2, 4.5]);
    expect(lerpSpan([1, 4], [3, 5], 0.9)).toEqual([3, 5]);
    expect(lerpSpan([0, 0], [2, 2], 0.5, { start: 0, end: 1 })).toEqual([1, 1]);
  });

  it('is over at both faces whatever its extent', () => {
    for (const extent of [0.2, 0.4, 1]) {
      const span = transitionOfExtent(extent);
      expect(transition(0, span)).toBe(0);
      expect(transition(1, span)).toBe(1);
      expect(transition(0.5, span)).toBeCloseTo(0.5, 9);
    }
    expect(transitionOfExtent(1)).toEqual({ start: 0, end: 1 });
    expect(transitionOfExtent(3)).toEqual({ start: 0, end: 1 });
    expect(transitionOfExtent(0)).toEqual({ start: 0.495, end: 0.505 });
  });
});

describe('axis parameter', () => {
  it('finds s back for every point of the swept profile, for every exit', () => {
    for (const exit of EXIT_FACES) {
      for (let i = 0; i <= 10; i++) {
        const s = i / 10;
        const sample = localPath(exit, s);
        for (const u of [1, 4, 6.5]) {
          expect(localAxisParameter(exit, profilePoint(sample, u))).toBeCloseTo(s, 6);
        }
      }
    }
  });

  it('clamps to 0 and 1 beyond the faces and gives 0.5 at the apex of a sharp turn', () => {
    expect(localAxisParameter(12, { x: 0, y: -APOTHEM - 3 })).toBe(0);
    expect(localAxisParameter(12, { x: 2, y: APOTHEM + 1 })).toBe(1);
    expect(localAxisParameter(2, { x: 0, y: -APOTHEM - 0.1 })).toBe(0);
    expect(localAxisParameter(4, { x: SIDE / 2, y: -APOTHEM })).toBe(0.5);
    expect(localAxisParameter(8, { x: -SIDE / 2, y: -APOTHEM })).toBe(0.5);
  });

  it('wraps the angle so that a point just before the entry of a turn reads 0, not a full turn', () => {
    const before = { x: 0, y: -APOTHEM - 0.5 };
    expect(localAxisParameter(2, before)).toBe(0);
    expect(localAxisParameter(10, before)).toBe(0);
    expect(localAxisParameter(4, { x: -0.5, y: -APOTHEM - 0.5 })).toBe(0);
    expect(localAxisParameter(8, { x: 0.5, y: -APOTHEM - 0.5 })).toBe(0);
  });

  it('works in the world for any heading', () => {
    for (const heading of HEADINGS) {
      const center = cellToWorld({ q: -2, r: 3 });
      const sample = worldPath(center, heading, 10, 0.3);
      expect(axisParameter(center, heading, 10, profilePoint(sample, 3))).toBeCloseTo(0.3, 6);
    }
    expect(axisParameter({ x: 0, y: 0 }, 0, 12, { x: 0, y: APOTHEM })).toBe(1);
  });
});
