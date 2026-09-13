import { TestBed } from '@angular/core/testing';

import { TileObstacles } from '@hexrace/tile';

import { TileDraft, probeReadout } from '@ui/lab/tile/tile-draft';

describe('TileDraft', () => {
  it('builds a valid tile by default, with every toggled obstacle and the line', () => {
    TestBed.configureTestingModule({});
    const obstacles = TestBed.inject(TileObstacles);
    const draft = new TileDraft();
    expect(draft.errors(obstacles)).toEqual([]);
    expect(draft.obstacles().map((o) => o.kind)).toEqual(['barrier', 'hazard', 'patch']);
    draft.leftBarrier = true;
    draft.ramp = true;
    expect(draft.obstacles()).toHaveLength(5);
    expect(draft.build().line).toBe(0.5);
    draft.rightBarrier = false;
    draft.hazard = false;
    draft.patch = false;
    draft.leftBarrier = false;
    draft.ramp = false;
    draft.line = false;
    expect(draft.obstacles()).toEqual([]);
    expect(draft.build().line).toBeNull();
    draft.exitProfile.roadWidth = 9;
    expect(draft.errors(obstacles)).toEqual([
      'exit: road of 9 units, expected 1 to 5',
      'exit: road plus shoulders make 11 units, at most 6',
      'exit: no landscape on the right: the block ends at unit 13',
    ]);
    expect(draft.build().skirtBase).toBeCloseTo((10 * 0.2 - 2) / 1.7, 9);
    draft.heading = 2;
    expect(draft.sweep().heading).toBe(2);
  });

  it('reads a dash when nothing is under the pointer, rounded values otherwise', () => {
    expect(probeReadout(null)).toEqual({ zone: '-', type: 0, s: 0, offset: 0 });
    expect(probeReadout({ zone: 'road', type: 2, s: 0.123456, offset: -1.2345 })).toEqual({
      zone: 'road',
      type: 2,
      s: 0.12,
      offset: -1.23,
    });
  });
});
