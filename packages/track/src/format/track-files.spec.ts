import { TestBed } from '@angular/core/testing';
import { type EnvironmentId } from '@hexrace/tile';

import { EXAMPLE_TRACK_FILES } from '@track/entity/examples/examples';
import { type TrackFileError } from '@track/entity/file-error';
import { type Track } from '@track/entity/track';
import { TrackFiles } from '@track/format/track-files';

const SKETCH = `hexrace-track 1

id: europe-ring-01
name: Small Ring
environment: europe
mode: track
laps: 3

# One line per tile, in the order of travel.
[tiles]
start  exit=12  pos=2 w=3  sh=1,1  h=5  t=1/1/1
       exit=2   pos=2 w=3  sh=1,1  h=5  t=1/1/1
       exit=12  pos=2 w=3  sh=1,1  h=6  t=1/1/1   obs=bump@0.45-0.55
       exit=2   pos=3 w=2  sh=1,1  h=6  t=2/1/1   obs=barrier:left,barrier:right
`;

const BROKEN = `hexrace-track 1
id: x
name: X
environment: mars
mode: drift
[tiles]
start exit=7 pos=2 w=3 h=5 t=1/1/1
start exit=12 pos=deux w=3 sh=1,1 h=5 t=1/1/1 foo=1
      exit=12 pos=2 w=3 h=5 t=1/1/1 obs=hazard:tiny@0.5
`;

function trackOf(files: TrackFiles, text: string): Track {
  const read = files.parse(text);
  if (!('track' in read)) throw new Error(JSON.stringify(read.errors));
  return read.track;
}

function errorsOf(files: TrackFiles, text: string): readonly TrackFileError[] {
  const read = files.parse(text);
  return 'errors' in read ? read.errors : [];
}

describe('TrackFiles', () => {
  let files: TrackFiles;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    files = TestBed.inject(TrackFiles);
  });

  it('reads the file of sketch 6', () => {
    const track = trackOf(files, SKETCH);
    expect(track.name).toBe('Small Ring');
    expect(track.mode).toBe('track');
    expect(track.laps).toBe(3);
    expect(track.tiles).toHaveLength(4);
    expect(track.tiles[3]?.obstacles).toEqual([
      { kind: 'barrier', side: 'left', from: 0, to: 1 },
      { kind: 'barrier', side: 'right', from: 0, to: 1 },
    ]);
  });

  it('reports every problem with its line, the header last', () => {
    expect(errorsOf(files, BROKEN)).toEqual([
      { line: 7, message: 'exit "7" is invalid, expected 12, 2, 4, 8 or 10' },
      { line: 8, message: '"start" is only allowed on the first tile' },
      { line: 8, message: 'pos "deux" is invalid, expected a whole number' },
      { line: 8, message: 'unknown key "foo"' },
      { line: 9, message: 'obstacle "hazard:tiny@0.5" is invalid' },
      { line: 0, message: 'header: environment "mars" is unknown' },
      { line: 0, message: 'header: mode "drift" is unknown, expected track or rally' },
    ]);
  });

  it('refuses a wrong format, a wrong version and an empty file', () => {
    expect(errorsOf(files, 'hexrace-board 1\n[tiles]\n')[0]?.message).toBe(
      'expected "hexrace-track 1" on the first line',
    );
    expect(errorsOf(files, 'hexrace-track 2\n[tiles]\n')[0]?.message).toBe(
      'version 2 is unknown, expected 1',
    );
    expect(errorsOf(files, '')).toContainEqual({
      line: 0,
      message: 'empty file: expected "hexrace-track 1"',
    });
  });

  it('names what the header is missing', () => {
    const messages = errorsOf(files, 'hexrace-track 1\nnot a pair\nlaps: many\n').map(
      (error: TrackFileError) => error.message,
    );
    expect(messages).toEqual([
      'expected "key: value", read "not a pair"',
      'header: "id" is missing',
      'header: "name" is missing',
      'header: environment "" is unknown',
      'header: mode "" is unknown, expected track or rally',
      'header: "laps" must be a whole number',
      'the [tiles] section is missing',
    ]);
  });

  it.each(EXAMPLE_TRACK_FILES)('writes back the example it read, byte for byte', (text: string) => {
    expect(files.serialize(trackOf(files, text))).toBe(text);
  });

  it.each(EXAMPLE_TRACK_FILES)('reads back the track it wrote', (text: string) => {
    const track = trackOf(files, text);
    expect(trackOf(files, files.serialize(track))).toEqual(track);
  });

  it('leaves the environment unnamed when it is not one of the three', () => {
    const track: Track = {
      id: 'x',
      name: 'X',
      environment: 'mars' as EnvironmentId,
      mode: 'rally',
      tiles: [],
    };
    expect(files.serialize(track)).toContain('environment: mars\n');
  });
});
