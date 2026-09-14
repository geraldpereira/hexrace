import { TestBed } from '@angular/core/testing';

import { type Track } from '@track/entity/track';
import { TrackExamples } from '@track/format/track-examples';

describe('TrackExamples', () => {
  let examples: TrackExamples;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    examples = TestBed.inject(TrackExamples);
  });

  it('reads the nine tracks the module ships with', () => {
    expect(examples.ids()).toEqual([
      'europe-ring-01',
      'europe-curves-01',
      'north-catalog-01',
      'europe-relief-01',
      'europe-line-01',
      'north-ring-01',
      'africa-triangle-01',
      'europe-overlap-01',
      'europe-invalid-01',
    ]);
    expect(examples.all().map((track: Track) => track.name)).toContain('Small Ring');
  });

  it('finds one by its id, and nothing by an unknown one', () => {
    expect(examples.of('europe-ring-01')?.tiles).toHaveLength(12);
    expect(examples.of('mars-01')).toBeNull();
  });

  it('drops a file that does not read rather than throwing', () => {
    examples.files = ['not a track file', ...examples.files.slice(0, 1)];
    expect(examples.ids()).toEqual(['europe-ring-01']);
  });
});
