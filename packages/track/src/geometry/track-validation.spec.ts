import { TestBed } from '@angular/core/testing';
import { type EnvironmentId } from '@hexrace/tile';

import { type TrackIssue } from '@track/entity/issue';
import { type Track, type TrackMode } from '@track/entity/track';
import { EMPTY_TRACK, tileOf, trackOf } from '@track/entity/track.mock';
import { TrackExamples } from '@track/format/track-examples';
import { TrackValidation } from '@track/geometry/track-validation';

describe('TrackValidation', () => {
  let validation: TrackValidation;
  let examples: TrackExamples;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    validation = TestBed.inject(TrackValidation);
    examples = TestBed.inject(TrackExamples);
  });

  function example(id: string): Track {
    return examples.of(id) ?? EMPTY_TRACK;
  }

  function messages(track: Track): string[] {
    return validation.validate(track).issues.map((issue: TrackIssue) => validation.format(issue));
  }

  it.each([
    'europe-ring-01',
    'north-ring-01',
    'europe-line-01',
    'europe-relief-01',
    'europe-curves-01',
    'north-catalog-01',
  ])('accepts %s', (id: string) => {
    const review = validation.validate(example(id));
    expect(review.issues).toEqual([]);
    expect(validation.isValid(review)).toBe(true);
    expect(review.placement.tiles).toHaveLength(example(id).tiles.length);
  });

  it('names the tile that covers another one', () => {
    const review = validation.validate(example('europe-overlap-01'));
    expect(review.issues.map((issue: TrackIssue) => validation.format(issue))).toEqual([
      'tile 6: covers tile 0 at (0,0)',
    ]);
    expect([...review.faulty]).toEqual([6]);
    expect(validation.isValid(review)).toBe(false);
  });

  it('names the last tile when the loop does not close', () => {
    const ring = example('europe-ring-01');
    const open: Track = { ...ring, tiles: ring.tiles.slice(0, 11) };
    const review = validation.validate(open);
    expect(review.issues).toHaveLength(1);
    expect(review.issues[0]?.code).toBe('not-closed');
    expect(review.issues[0]?.tile).toBe(10);
  });

  it('adds up a bad profile, an obstacle that spills and a doubtful header', () => {
    expect(messages(example('europe-invalid-01'))).toEqual([
      'laps mean nothing outside Track mode',
      'tile 1: no landscape on the left: the block starts at unit 0',
      'tile 2: hazard large at 0.05: spills out of the tile',
    ]);
    const faulty = [...validation.validate(example('europe-invalid-01')).faulty];
    faulty.sort((a: number, b: number) => a - b);
    expect(faulty).toEqual([1, 2]);
  });

  it('refuses a hairpin under the start line', () => {
    expect(messages(example('africa-triangle-01'))).toEqual([
      'tile 0: the start and finish tile cannot be a hairpin',
    ]);
  });

  it('refuses an empty id, an unknown environment or mode, and no tile at all', () => {
    const broken = trackOf([], {
      id: '  ',
      environment: 'mars' as EnvironmentId,
      mode: 'drift' as TrackMode,
      laps: 2,
    });
    expect(messages(broken)).toEqual([
      'empty id',
      'unknown environment: mars',
      'unknown mode: drift',
      'laps mean nothing outside Track mode',
      'no tile',
    ]);
  });

  it('refuses a slope over the threshold of its exit', () => {
    expect(messages(trackOf([tileOf(12, { height: 0 }), tileOf(12, { height: 44 })]))).toEqual([
      'tile 1: slope of 21 % on a straight, at most 20 %',
    ]);
    expect(messages(trackOf([tileOf(2, { height: 0 }), tileOf(2, { height: 30 })]))).toContain(
      'tile 1: slope of 16 % in a wide turn, at most 15 %',
    );
    expect(
      messages(trackOf([tileOf(12, { height: 0 }), tileOf(4, { height: 18 }), tileOf(12)])),
    ).toContain('tile 1: slope of 14 % in a sharp turn, at most 10 %');
  });

  it('refuses a track taller than two hundred metres', () => {
    const tall = trackOf([tileOf(12, { height: 0 }), tileOf(12, { height: 1500 })]);
    expect(messages(tall)).toContain('amplitude of 300 m, at most 200 m');
  });
});
