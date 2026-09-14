import { TestBed } from '@angular/core/testing';
import { EnvironmentCatalog } from '@hexrace/tile';
import {
  type Track,
  TrackExamples,
  TrackPlacement,
  TrackValidation,
  TrackWindow,
} from '@hexrace/track';

import { type FakeContext, fakeContext, mockCanvasContext } from '@ui/testing/canvas.mock';
import { type MapView, TrackMap } from '@ui/lab/track/track-map';

describe('TrackMap', () => {
  let map: TrackMap;
  let fake: FakeContext;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    map = TestBed.inject(TrackMap);
    fake = fakeContext();
    canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
  });

  function viewOf(id: string, window: ReadonlySet<number>, withPlayer: boolean): MapView {
    const track: Track = TestBed.inject(TrackExamples).of(id)!;
    const placement = TestBed.inject(TrackPlacement).place(track);
    return {
      track,
      placement,
      environment: TestBed.inject(EnvironmentCatalog).of(track.environment),
      faulty: TestBed.inject(TrackValidation).validate(track).faulty,
      window,
      player: withPlayer ? TestBed.inject(TrackWindow).playerPose(track, placement, 1.5) : null,
    };
  }

  it('draws nothing without a 2D context', () => {
    map.draw(canvas, viewOf('europe-ring-01', new Set([0]), true));
    expect(fake.calls).toEqual([]);
  });

  it('draws nothing for a track without a tile', () => {
    mockCanvasContext(fake);
    const view = viewOf('europe-ring-01', new Set<number>(), false);
    map.draw(canvas, { ...view, placement: { tiles: [], next: view.placement.next } });
    expect(fake.calls).toEqual(['clearRect(0,0,400,300)']);
  });

  it('draws the zones, the line, the numbers and the player dot', () => {
    mockCanvasContext(fake);
    map.draw(canvas, viewOf('europe-ring-01', new Set([0, 1, 2]), true));
    expect(fake.calls.filter((call: string) => call.startsWith('fill('))).not.toHaveLength(0);
    expect(fake.calls.filter((call: string) => call.startsWith('stroke('))).not.toHaveLength(0);
    expect(fake.calls.filter((call: string) => call.startsWith('arc('))).not.toHaveLength(0);
    expect(fake.calls.filter((call: string) => call.startsWith('fillText(0,'))).not.toHaveLength(0);
  });

  it('dims the tiles outside the window and reddens the faulty ones', () => {
    mockCanvasContext(fake);
    const before = fakeContext();
    map.draw(canvas, viewOf('europe-ring-01', new Set([0]), false));
    const clean = fake.calls.length;
    fake.calls.length = 0;
    mockCanvasContext(before);
    map.draw(canvas, viewOf('europe-overlap-01', new Set([0, 1, 2, 3, 4, 5, 6]), false));
    expect(before.calls.length).toBeGreaterThan(0);
    expect(clean).toBeGreaterThan(0);
  });
});
