import { TestBed } from '@angular/core/testing';
import { JoltConversions, JoltPhysics, LAYER_MOVING } from '@hexrace/engine';

import { TEN_STEPS_HIGH } from '@tile/entity/profile.mock';
import { sweepOf } from '@tile/entity/sweep.mock';
import { TileTriangles } from '@tile/geometry/tile-triangles';
import { TileBodies } from '@tile/physics/tile-bodies';

describe('TileBodies', () => {
  it('holds a crate dropped on the tile at the ground height, and frees it', async () => {
    TestBed.configureTestingModule({});
    const physics = TestBed.inject(JoltPhysics);
    await physics.load();
    const sweep = sweepOf({ exit: 2, entry: TEN_STEPS_HIGH });
    const triangles = TestBed.inject(TileTriangles).build({ sweep, skirtBase: -2 });
    const ground = TestBed.inject(TileBodies).create(triangles);
    expect(physics.physicsSystem.GetNumBodies()).toBe(1);
    expect(ground.IsStatic()).toBe(true);

    const Jolt = physics.Jolt;
    const conversions = TestBed.inject(JoltConversions);
    const settings = new Jolt.BodyCreationSettings(
      new Jolt.BoxShape(conversions.vec3({ x: 0.3, y: 0.3, z: 0.3 })),
      conversions.rvec3({ x: 0, y: 6, z: 0 }),
      conversions.identity(),
      Jolt.EMotionType_Dynamic,
      LAYER_MOVING,
    );
    const crate = physics.bodyInterface.CreateBody(settings);
    Jolt.destroy(settings);
    physics.bodyInterface.AddBody(crate.GetID(), Jolt.EActivation_Activate);
    for (let i = 0; i < 240; i++) physics.step(1 / 60);
    expect(crate.GetPosition().GetY()).toBeCloseTo(10 * 0.2 + 0.3, 1);

    physics.unregister(crate);
    physics.unregister(ground);
    expect(physics.physicsSystem.GetNumBodies()).toBe(0);
  });
});
