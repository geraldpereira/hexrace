import { TestBed } from '@angular/core/testing';

import { JoltConversions } from '@engine/physics/jolt-conversions';
import { JoltPhysics } from '@engine/physics/jolt-physics';

describe('JoltConversions', () => {
  it('goes to Jolt and back, identity quaternion included', async () => {
    TestBed.configureTestingModule({});
    const physics = TestBed.inject(JoltPhysics);
    await physics.load();
    const conversions = TestBed.inject(JoltConversions);
    const v = conversions.vec3({ x: 1, y: 2, z: 3 });
    const r = conversions.rvec3({ x: -1, y: 0.5, z: 9 });
    expect(conversions.read(v)).toEqual({ x: 1, y: 2, z: 3 });
    expect(conversions.read(r)).toEqual({ x: -1, y: 0.5, z: 9 });
    expect(conversions.readQuat(conversions.identity())).toEqual({ x: 0, y: 0, z: 0, w: 1 });
    physics.Jolt.destroy(v);
    physics.Jolt.destroy(r);
  });
});
