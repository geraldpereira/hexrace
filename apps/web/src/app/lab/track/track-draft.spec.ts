import { TestBed } from '@angular/core/testing';
import { TrackExamples, TrackFiles, TrackGenerator } from '@hexrace/track';

import { TrackDraft } from '@ui/lab/track/track-draft';

describe('TrackDraft', () => {
  let draft: TrackDraft;
  let examples: TrackExamples;
  let files: TrackFiles;
  let generator: TrackGenerator;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    draft = new TrackDraft();
    examples = TestBed.inject(TrackExamples);
    files = TestBed.inject(TrackFiles);
    generator = TestBed.inject(TrackGenerator);
  });

  it('loads an example by its id, and says when there is none', () => {
    expect(draft.load(examples, files, generator).track?.name).toBe('Loop');
    draft.example = 'mars-01';
    expect(draft.load(examples, files, generator)).toEqual({
      track: null,
      errors: ['no example mars-01'],
    });
  });

  it('reads the text area, with the line of each problem', () => {
    draft.source = 'text';
    draft.text = files.serialize(examples.of('europe-line-01')!);
    expect(draft.load(examples, files, generator).track?.tiles).toHaveLength(4);
    draft.text = 'hexrace-track 1\nnot a pair\n[tiles]\n';
    expect(draft.load(examples, files, generator).errors).toEqual([
      'line 2: expected "key: value", read "not a pair"',
      'header: "id" is missing',
      'header: "name" is missing',
      'header: environment "" is unknown',
      'header: mode "" is unknown, expected track or rally',
    ]);
  });

  it('generates from the dials, falling back to a seed when the box is empty', () => {
    draft.source = 'generated';
    draft.length = 12;
    draft.seed = '';
    expect(draft.config().seed).toBe('hexrace');
    const load = draft.load(examples, files, generator);
    expect(load.track?.tiles).toHaveLength(12);
    draft.seed = 'other';
    expect(draft.config().seed).toBe('other');
    expect(draft.load(examples, files, generator).track?.tiles).not.toEqual(load.track?.tiles);
  });
});
