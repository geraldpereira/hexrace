import { TestBed } from '@angular/core/testing';

import { type ExitFace, type Face, EXIT_FACES, FACES } from '@tile/entity/face';
import { Faces } from '@tile/geometry/faces';

describe('Faces', () => {
  let faces: Faces;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    faces = TestBed.inject(Faces);
  });

  it('ranks the faces clockwise from 12 and back', () => {
    expect(FACES.map((face: Face) => faces.index(face))).toEqual([0, 1, 2, 3, 4, 5]);
    expect(FACES.map((face: Face) => faces.fromIndex(faces.index(face)))).toEqual(FACES);
  });

  it('wraps ranks modulo six in both directions, and falls back to 12 on nonsense', () => {
    expect(faces.fromIndex(6)).toBe(12);
    expect(faces.fromIndex(7)).toBe(2);
    expect(faces.fromIndex(-1)).toBe(10);
    expect(faces.fromIndex(Number.NaN)).toBe(12);
  });

  it('opposes 12 and 6, 2 and 8, 4 and 10', () => {
    expect(faces.opposite(12)).toBe(6);
    expect(faces.opposite(2)).toBe(8);
    expect(faces.opposite(10)).toBe(4);
    for (const face of FACES) expect(faces.opposite(faces.opposite(face))).toBe(face);
  });

  it('never leaves by the entry face', () => {
    expect(faces.isFace(6)).toBe(true);
    expect(faces.isExit(6)).toBe(false);
    expect(faces.isFace(7)).toBe(false);
    for (const face of EXIT_FACES) expect(faces.isExit(face)).toBe(true);
  });

  it('reads the turn in the exit face, positive to the right', () => {
    expect(EXIT_FACES.map((exit: ExitFace) => faces.turnOf(exit))).toEqual([0, 1, 2, -2, -1]);
    expect(EXIT_FACES.map((exit: ExitFace) => faces.turnKind(exit))).toEqual([
      'straight',
      'wide',
      'sharp',
      'sharp',
      'wide',
    ]);
  });
});
