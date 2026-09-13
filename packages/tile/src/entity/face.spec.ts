import {
  type Face,
  ENTRY_FACE,
  EXIT_FACES,
  FACES,
  faceFromIndex,
  faceIndex,
  isExitFace,
  isFace,
  oppositeFace,
  turnKind,
  turnOf,
} from '@tile/entity/face';

describe('faces', () => {
  it('ranks the faces clockwise from 12', () => {
    expect(FACES.map(faceIndex)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(FACES.map((face: Face) => faceFromIndex(faceIndex(face)))).toEqual(FACES);
  });

  it('wraps modulo six both ways', () => {
    expect(faceFromIndex(6)).toBe(12);
    expect(faceFromIndex(7)).toBe(2);
    expect(faceFromIndex(-1)).toBe(10);
    expect(faceFromIndex(Number.NaN)).toBe(12);
  });

  it('opposes 12 and 6, 2 and 8, 4 and 10', () => {
    expect(oppositeFace(12)).toBe(6);
    expect(oppositeFace(2)).toBe(8);
    expect(oppositeFace(10)).toBe(4);
    for (const face of FACES) expect(oppositeFace(oppositeFace(face))).toBe(face);
  });

  it('never leaves by the entry face', () => {
    expect(isFace(ENTRY_FACE)).toBe(true);
    expect(isExitFace(ENTRY_FACE)).toBe(false);
    expect(isFace(7)).toBe(false);
    for (const face of EXIT_FACES) expect(isExitFace(face)).toBe(true);
  });

  it('reads the turn in the exit face, positive to the right', () => {
    expect(turnOf(12)).toBe(0);
    expect(turnOf(2)).toBe(1);
    expect(turnOf(4)).toBe(2);
    expect(turnOf(10)).toBe(-1);
    expect(turnOf(8)).toBe(-2);
  });

  it.each([
    [12, 'straight'],
    [10, 'wide'],
    [2, 'wide'],
    [4, 'sharp'],
    [8, 'sharp'],
  ] as const)('calls exit %d a %s', (exit, kind) => {
    expect(turnKind(exit)).toBe(kind);
  });
});
