import { TestBed } from '@angular/core/testing';
import { JoltPhysics, LAYER_MOVING } from '@hexrace/engine';

import { type Profile } from '@tile/entity/profile';
import { type TileSweep } from '@tile/entity/sweep';
import { TileTriangles } from '@tile/entity/triangles';
import { UNIT_METERS } from '@tile/entity/units';
import { TileBodies } from '@tile/physics/tile-body';

const profile: Profile = {
  position: 2,
  roadWidth: 3,
  leftShoulder: 1,
  rightShoulder: 1,
  height: 10,
  road: 1,
  shoulder: 1,
  landscape: 1,
};

describe('TileBodies', () => {
  it('holds a crate dropped on the tile at the ground height', async () => {
    TestBed.configureTestingModule({});
    const physics = TestBed.inject(JoltPhysics);
    await physics.load();
    const sweep: TileSweep = {
      center: { x: 0, y: 0 },
      heading: 0,
      exit: 2,
      entry: profile,
      exitProfile: profile,
    };
    const triangles = TestBed.inject(TileTriangles).build({ sweep, skirtBase: -2 });
    const ground = TestBed.inject(TileBodies).create(triangles);
    expect(physics.physicsSystem.GetNumBodies()).toBe(1);

    const Jolt = physics.Jolt;
    const settings = new Jolt.BodyCreationSettings(
      new Jolt.BoxShape(new Jolt.Vec3(0.3, 0.3, 0.3)),
      new Jolt.RVec3(0, 6, 0),
      Jolt.Quat.prototype.sIdentity(),
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
    expect(UNIT_METERS).toBe(1.7);
  });
});
