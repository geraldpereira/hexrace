import { TestBed } from '@angular/core/testing';
import { LINE_AT } from '@hexrace/tile';

import { EMPTY_TRACK, climbOf, tileOf, trackOf } from '@track/entity/track.mock';
import { TrackMarks } from '@track/geometry/track-marks';

describe('TrackMarks', () => {
  let marks: TrackMarks;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    marks = TestBed.inject(TrackMarks);
  });

  it('puts start and finish on the first tile in Track, at both ends in Rally', () => {
    expect(marks.marks(climbOf([1, 2, 3], { mode: 'track' }))).toEqual([
      { tile: 0, kind: 'both', at: LINE_AT },
    ]);
    expect(marks.marks(climbOf([1, 2, 3, 4]))).toEqual([
      { tile: 0, kind: 'start', at: LINE_AT },
      { tile: 3, kind: 'finish', at: LINE_AT },
    ]);
    expect(marks.marks(climbOf([1]))).toEqual([{ tile: 0, kind: 'both', at: LINE_AT }]);
    expect(marks.marks(EMPTY_TRACK)).toEqual([]);
  });

  it('says which tiles carry a line', () => {
    const track = climbOf([1, 2, 3]);
    expect(marks.at(track, 0)).toBe(LINE_AT);
    expect(marks.at(track, 1)).toBeNull();
    expect(marks.at(track, 2)).toBe(LINE_AT);
  });

  it('refuses a hairpin under a line, and names which line it is', () => {
    const loop = trackOf([tileOf(4), tileOf(4), tileOf(4)], { mode: 'track' });
    expect(marks.issue(loop, { tile: 0, kind: 'both', at: LINE_AT })).toBe(
      'the start and finish tile cannot be a hairpin',
    );
    const rally = trackOf([tileOf(8), tileOf(12), tileOf(4)]);
    expect(marks.issue(rally, { tile: 0, kind: 'start', at: LINE_AT })).toBe(
      'the start tile cannot be a hairpin',
    );
    expect(marks.issue(rally, { tile: 2, kind: 'finish', at: LINE_AT })).toBe(
      'the finish tile cannot be a hairpin',
    );
    expect(marks.issue(rally, { tile: 1, kind: 'finish', at: LINE_AT })).toBeNull();
    expect(marks.issue(rally, { tile: 9, kind: 'finish', at: LINE_AT })).toBeNull();
  });
});
