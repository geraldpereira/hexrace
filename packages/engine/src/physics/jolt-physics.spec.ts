import { TestBed } from '@angular/core/testing';

import {
  JoltPhysics,
  LAYER_MOVING,
  LAYER_NON_MOVING,
  type JoltBody,
} from '@engine/physics/jolt-physics';
import { Component, GameObject } from '@engine/scene/game-object';

class Hits extends Component {
  hits: string[] = [];
  override onCollisionEnter(other: GameObject): void {
    this.hits.push(other.name);
  }
}

describe('JoltPhysics', () => {
  let physics: JoltPhysics;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    physics = TestBed.inject(JoltPhysics);
  });

  function box(halfY: number, y: number, moving: boolean): JoltBody {
    const Jolt = physics.Jolt;
    const shape = new Jolt.BoxShape(new Jolt.Vec3(2, halfY, 2));
    const settings = new Jolt.BodyCreationSettings(
      shape,
      new Jolt.RVec3(0, y, 0),
      Jolt.Quat.prototype.sIdentity(),
      moving ? Jolt.EMotionType_Dynamic : Jolt.EMotionType_Static,
      moving ? LAYER_MOVING : LAYER_NON_MOVING,
    );
    const body = physics.bodyInterface.CreateBody(settings);
    Jolt.destroy(settings);
    physics.bodyInterface.AddBody(body.GetID(), Jolt.EActivation_Activate);
    return body;
  }

  it('refuses the API before load resolves', () => {
    expect(physics.ready).toBe(false);
    expect(physics.loadMs).toBe(0);
    expect(() => physics.Jolt).toThrow('load() has not resolved yet');
    expect(() => physics.bodyInterface).toThrow();
    expect(() => physics.physicsSystem).toThrow();
    expect(() => physics.step(1 / 60)).toThrow();
  });

  it('loads the wasm once and measures it', async () => {
    const first = physics.load();
    const second = physics.load();
    expect(second).toBe(first);
    await first;
    expect(physics.ready).toBe(true);
    expect(physics.loadMs).toBeGreaterThanOrEqual(0);
    expect(physics.physicsSystem.GetNumBodies()).toBe(0);
  });

  it('turns a new contact into onCollisionEnter on both registered objects', async () => {
    await physics.load();
    const ground = GameObject.named('ground');
    const groundHits = ground.add(new Hits());
    const crate = GameObject.named('crate');
    const crateHits = crate.add(new Hits());
    const groundBody = box(0.5, -0.5, false);
    const crateBody = box(0.5, 1.5, true);
    const stray = box(0.5, 20, true);
    physics.register(groundBody, ground);
    physics.register(crateBody, crate);
    for (let i = 0; i < 120; i++) physics.step(1 / 60);
    expect(groundHits.hits.length).toBeGreaterThan(0);
    expect(groundHits.hits.every((h) => h === 'crate')).toBe(true);
    expect(crateHits.hits).toEqual(groundHits.hits.map(() => 'ground'));
    expect(crateBody.GetPosition().GetY()).toBeCloseTo(0.5, 1);

    physics.unregister(crateBody);
    physics.unregister(groundBody);
    physics.unregister(stray);
    expect(physics.physicsSystem.GetNumBodies()).toBe(0);
  });

  it('ignores a contact with a body nobody registered', async () => {
    await physics.load();
    const ground = GameObject.named('ground');
    const groundHits = ground.add(new Hits());
    const groundBody = box(0.5, -0.5, false);
    const crateBody = box(0.5, 1.5, true);
    physics.register(groundBody, ground);
    for (let i = 0; i < 60; i++) physics.step(1 / 60);
    expect(groundHits.hits).toEqual([]);
    physics.unregister(groundBody);
    physics.unregister(crateBody);
  });
});
