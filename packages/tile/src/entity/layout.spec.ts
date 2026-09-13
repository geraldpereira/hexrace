import { type Heading, neighbor } from '@tile/entity/grid';
import {
  type Vec2,
  APOTHEM,
  PITCH,
  SIDE,
  add,
  blockSpan,
  cellToWorld,
  directionVector,
  distance,
  entryFrame,
  exitFrame,
  facePoint,
  hexCorners,
  insideConvex,
  rightOf,
  roadSpan,
  scale,
} from '@tile/entity/layout';
import { type Profile } from '@tile/entity/profile';

const HEADINGS: readonly Heading[] = [0, 1, 2, 3, 4, 5];
const close = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;
const samePoint = (a: Vec2, b: Vec2): boolean => close(a.x, b.x) && close(a.y, b.y);

const profile: Profile = {
  position: 2,
  roadWidth: 3,
  leftShoulder: 1,
  rightShoulder: 0,
  height: 0,
  road: 1,
  shoulder: 1,
  landscape: 1,
};

describe('world coordinates', () => {
  it('adds, scales and measures vectors', () => {
    expect(add({ x: 1, y: 2 }, { x: 3, y: -5 })).toEqual({ x: 4, y: -3 });
    expect(scale({ x: 1, y: -2 }, 3)).toEqual({ x: 3, y: -6 });
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(rightOf({ x: 0, y: 1 })).toEqual({ x: 1, y: -0 });
  });

  it('puts neighbours one pitch apart, centre to centre, in the announced direction', () => {
    for (const heading of HEADINGS) {
      const there = cellToWorld(neighbor({ q: 0, r: 0 }, heading));
      const dir = directionVector(heading);
      expect(samePoint(there, scale(dir, PITCH))).toBe(true);
    }
  });

  it('has corners one side from the centre and faces one apothem away', () => {
    const corners = hexCorners({ x: 0, y: 0 });
    expect(corners).toHaveLength(6);
    for (const c of corners) expect(close(Math.hypot(c.x, c.y), SIDE)).toBe(true);
    expect(close(APOTHEM, (SIDE * Math.sqrt(3)) / 2)).toBe(true);
  });

  it('puts the entry face of a north tile at the bottom, the driver’s left to the west', () => {
    const frame = entryFrame({ x: 0, y: 0 }, 0);
    expect(samePoint(facePoint(frame, 0), { x: -SIDE / 2, y: -APOTHEM })).toBe(true);
    expect(samePoint(facePoint(frame, SIDE), { x: SIDE / 2, y: -APOTHEM })).toBe(true);
    expect(samePoint(facePoint(frame, SIDE / 2, APOTHEM), { x: 0, y: 0 })).toBe(true);
  });

  it('makes a tile’s exit face coincide with the next tile’s entry face', () => {
    for (const heading of HEADINGS) {
      const here = { x: 0, y: 0 };
      const there = cellToWorld(neighbor({ q: 0, r: 0 }, heading));
      const out = exitFrame(here, heading);
      const inn = entryFrame(there, heading);
      for (const u of [0, 2.5, SIDE]) {
        expect(samePoint(facePoint(out, u), facePoint(inn, u))).toBe(true);
      }
    }
  });

  it('tells inside from outside a clockwise hexagon', () => {
    const corners = hexCorners({ x: 10, y: -4 });
    expect(insideConvex({ x: 10, y: -4 }, corners)).toBe(true);
    expect(insideConvex({ x: 10 + SIDE, y: -4 }, corners)).toBe(true);
    expect(insideConvex({ x: 10 + SIDE + 0.01, y: -4 }, corners)).toBe(false);
    expect(insideConvex({ x: 10, y: -4 + APOTHEM + 0.01 }, corners)).toBe(false);
  });

  it('reads the spans of the road and of the block from a profile', () => {
    expect(roadSpan(profile)).toEqual([2, 5]);
    expect(blockSpan(profile)).toEqual([1, 5]);
  });
});
