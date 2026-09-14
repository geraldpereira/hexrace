import { TestBed } from '@angular/core/testing';

import { type PlacedTile } from '@track/entity/placement';
import { type Track } from '@track/entity/track';
import { EMPTY_TRACK, climbOf, tileOf, trackOf } from '@track/entity/track.mock';
import { TrackExamples } from '@track/format/track-examples';
import { TrackPlacement } from '@track/geometry/track-placement';

describe('TrackPlacement', () => {
  let placement: TrackPlacement;
  let examples: TrackExamples;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    placement = TestBed.inject(TrackPlacement);
    examples = TestBed.inject(TrackExamples);
  });

  function example(id: string): Track {
    return examples.of(id) ?? EMPTY_TRACK;
  }

  it('lays a straight line towards the north', () => {
    const line = climbOf([10, 10, 10, 10]);
    const { tiles, next } = placement.place(line);
    expect(tiles.map((t: PlacedTile) => t.cell)).toEqual([
      { q: 0, r: 0 },
      { q: 0, r: 1 },
      { q: 0, r: 2 },
      { q: 0, r: 3 },
    ]);
    expect(tiles.every((t: PlacedTile) => t.heading === 0)).toBe(true);
    expect(next).toEqual({ cell: { q: 0, r: 4 }, heading: 0 });
    expect(placement.closureIssue(line, placement.place(line))).toBeNull();
  });

  it('closes the small ring on twelve distinct cells', () => {
    const ring = example('europe-ring-01');
    const laid = placement.place(ring);
    expect(placement.closureIssue(ring, laid)).toBeNull();
    expect(placement.overlaps(laid)).toEqual([]);
    expect(new Set(laid.tiles.map((t: PlacedTile) => `${t.cell.q},${t.cell.r}`)).size).toBe(12);
  });

  it('closes three hairpins around a corner and six wide turns around a tile', () => {
    const triangle = example('africa-triangle-01');
    const hexagon = example('north-ring-01');
    expect(placement.place(triangle).tiles.map((t: PlacedTile) => t.heading)).toEqual([0, 2, 4]);
    expect(placement.place(hexagon).tiles.map((t: PlacedTile) => t.heading)).toEqual([
      0, 5, 4, 3, 2, 1,
    ]);
    expect(placement.closureIssue(triangle, placement.place(triangle))).toBeNull();
    expect(placement.closureIssue(hexagon, placement.place(hexagon))).toBeNull();
  });

  it('says where a loop that does not close ends up, and refuses an empty loop', () => {
    const ring = example('europe-ring-01');
    const open: Track = { ...ring, tiles: ring.tiles.slice(0, 11) };
    expect(placement.closureIssue(open, placement.place(open))).toBe(
      'the loop does not close: after the last tile we reach (0, -1) heading 5, ' +
        'the start is at (0, 0) heading 0',
    );
    const empty = trackOf([], { mode: 'track' });
    expect(placement.closureIssue(empty, placement.place(empty))).toBe('no tile');
  });

  it('sees a tile laid on another one and knows where to stop', () => {
    const overlap = example('europe-overlap-01');
    const laid = placement.place(overlap);
    expect(placement.overlaps(laid)).toEqual([{ tile: 6, previous: 0, cell: { q: 0, r: 0 } }]);
    expect(placement.firstOverlap(laid)).toBe(6);
    const prefix = placement.validPrefix(laid);
    expect(prefix.tiles).toHaveLength(6);
    expect(prefix.next).toEqual({ cell: { q: 0, r: 0 }, heading: 0 });
    const ring = placement.place(example('europe-ring-01'));
    expect(placement.firstOverlap(ring)).toBeNull();
    expect(placement.validPrefix(ring).tiles).toHaveLength(12);
  });

  it('gives each laid tile its entry profile and its two slopes', () => {
    const { tiles } = placement.place(example('europe-ring-01'));
    expect(tiles[4]?.entry.roadWidth).toBe(3);
    expect(tiles[4]?.tile.profile.roadWidth).toBe(2);
    expect(tiles[0]?.entrySlope).toBe(tiles.at(-1)?.exitSlope);
  });

  it('starts a track wherever it is asked to', () => {
    const laid = placement.place(trackOf([tileOf(2)]), { cell: { q: 3, r: -1 }, heading: 4 });
    expect(laid.tiles[0]?.cell).toEqual({ q: 3, r: -1 });
    expect(laid.next.heading).toBe(5);
  });
});
