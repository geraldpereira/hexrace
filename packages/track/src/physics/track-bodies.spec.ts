import { TestBed } from '@angular/core/testing';
import { JoltPhysics } from '@hexrace/engine';
import { type TileBuild, TileTriangles } from '@hexrace/tile';

import { climbOf } from '@track/entity/track.mock';
import { TrackPlacement } from '@track/geometry/track-placement';
import { TrackSweeps } from '@track/geometry/track-sweeps';
import { TrackBodies } from '@track/physics/track-bodies';

describe('TrackBodies', () => {
  it('makes one static body per tile of the window and frees them', async () => {
    TestBed.configureTestingModule({});
    const physics = TestBed.inject(JoltPhysics);
    await physics.load();
    const track = climbOf([10, 12]);
    const builds: TileBuild[] = TestBed.inject(TrackSweeps).builds(
      track,
      TestBed.inject(TrackPlacement).place(track),
    );
    const bodies = TestBed.inject(TrackBodies);
    const first = builds[0];
    const second = builds[1];
    expect(first && second).toBeTruthy();
    if (!first || !second) return;

    const made = [
      bodies.create(first),
      bodies.create(second, TestBed.inject(TileTriangles).build(second)),
    ];
    expect(physics.physicsSystem.GetNumBodies()).toBe(2);
    expect(made[0]?.IsStatic()).toBe(true);
    for (const body of made) if (body) bodies.remove(body);
    expect(physics.physicsSystem.GetNumBodies()).toBe(0);
  });
});
