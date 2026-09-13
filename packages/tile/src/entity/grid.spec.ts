import { EXIT_FACES, faceIndex } from '@tile/entity/face';
import {
  type Heading,
  HEADING_OFFSETS,
  cellKey,
  exitHeading,
  neighbor,
  sameCell,
  samePose,
  turnHeading,
} from '@tile/entity/grid';

const HEADINGS: readonly Heading[] = [0, 1, 2, 3, 4, 5];

describe('grid', () => {
  it('has six neighbours and comes back after a full turn', () => {
    expect(HEADING_OFFSETS).toHaveLength(6);
    let cell = { q: 3, r: -2 };
    for (const heading of HEADINGS) cell = neighbor(cell, heading);
    expect(sameCell(cell, { q: 3, r: -2 })).toBe(true);
  });

  it('puts the opposite direction back on the starting cell', () => {
    for (const heading of HEADINGS) {
      const there = neighbor({ q: 0, r: 0 }, heading);
      expect(neighbor(there, turnHeading(heading, 3))).toEqual({ q: 0, r: 0 });
    }
  });

  it('falls back to no move on a heading out of range', () => {
    expect(neighbor({ q: 1, r: 1 }, 7 as Heading)).toEqual({ q: 1, r: 1 });
  });

  it('keys and compares cells', () => {
    expect(cellKey({ q: -1, r: 2 })).toBe('-1,2');
    expect(sameCell({ q: 1, r: 2 }, { q: 1, r: 2 })).toBe(true);
    expect(sameCell({ q: 1, r: 2 }, { q: 2, r: 1 })).toBe(false);
  });

  it('turns a heading modulo six in both directions', () => {
    expect(turnHeading(5, 1)).toBe(0);
    expect(turnHeading(0, -1)).toBe(5);
    expect(turnHeading(2, 8)).toBe(4);
  });

  it('makes the exit heading the face index added to the heading', () => {
    for (const heading of HEADINGS) {
      for (const exit of EXIT_FACES) {
        expect(exitHeading(heading, exit)).toBe(turnHeading(heading, faceIndex(exit)));
      }
    }
    expect(exitHeading(0, 12)).toBe(0);
    expect(exitHeading(4, 4)).toBe(0);
  });

  it('compares poses by cell and heading', () => {
    const pose = { cell: { q: 1, r: 1 }, heading: 2 as Heading };
    expect(samePose(pose, { ...pose })).toBe(true);
    expect(samePose(pose, { ...pose, heading: 3 })).toBe(false);
    expect(samePose(pose, { cell: { q: 0, r: 1 }, heading: 2 })).toBe(false);
  });
});
