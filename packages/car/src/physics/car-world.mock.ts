import { TestBed } from '@angular/core/testing';
import {
  FIXED_TIMESTEP,
  type GameObject,
  type JoltBody,
  JoltPhysics,
  LAYER_NON_MOVING,
  type Scene,
  Scenes,
} from '@hexrace/engine';
import { Inputs } from '@hexrace/inputs';

import { type SurfaceProbe, type SurfaceQuery } from '@car/entity/surface-feel';
import { CarBodies } from '@car/physics/car-bodies';
import { CarController } from '@car/physics/car-controller';
import { type CarRig } from '@car/physics/car-rig';
import { carSpec } from '@car/entity/car.mock';

export interface CarWorld {
  physics: JoltPhysics;
  scene: Scene;
  car: CarController;
  object: GameObject;
  inputs: Inputs;
  ground: JoltBody;
  step(times?: number): void;
  destroy(): void;
}

export class FlatProbe implements SurfaceProbe {
  answer: SurfaceQuery | null = { environment: 'europe', zone: 'road', rank: 1 };
  seen = 0;

  at(): SurfaceQuery | null {
    this.seen++;
    return this.answer;
  }
}

export async function carWorld(
  setUp: (car: CarController) => void = () => undefined,
): Promise<CarWorld> {
  const physics = TestBed.inject(JoltPhysics);
  await physics.load();
  const Jolt = physics.Jolt;
  const shape = new Jolt.BoxShape(new Jolt.Vec3(200, 1, 200));
  const settings = new Jolt.BodyCreationSettings(
    shape,
    new Jolt.RVec3(0, -1, 0),
    Jolt.Quat.prototype.sIdentity(),
    Jolt.EMotionType_Static,
    LAYER_NON_MOVING,
  );
  settings.mFriction = 1;
  const ground = physics.bodyInterface.CreateBody(settings);
  physics.bodyInterface.AddBody(ground.GetID(), Jolt.EActivation_DontActivate);
  Jolt.destroy(settings);

  const scene = TestBed.inject(Scenes).create();
  const car = scene.instantiate(CarController);
  setUp(car);
  const object = scene.spawn('car');
  object.add(car);
  scene.start();
  const inputs = TestBed.inject(Inputs);
  return {
    physics,
    scene,
    car,
    object,
    inputs,
    ground,
    step(times = 1): void {
      for (let i = 0; i < times; i++) {
        scene.fixedUpdate();
        physics.step(FIXED_TIMESTEP);
        scene.render(FIXED_TIMESTEP);
      }
    },
    destroy(): void {
      scene.destroy();
      physics.bodyInterface.RemoveBody(ground.GetID());
      physics.bodyInterface.DestroyBody(ground.GetID());
    },
  };
}

export interface RigWorld {
  physics: JoltPhysics;
  rig: CarRig;
  step(times?: number): void;
  destroy(): void;
}

export async function rigWorld(): Promise<RigWorld> {
  const world = await carWorld();
  world.scene.destroy();
  const bodies = TestBed.inject(CarBodies);
  const rig = bodies.create(carSpec(), { x: 0, y: 1.5, z: 0 }, { x: 0, y: 0, z: 0, w: 1 });
  return {
    physics: world.physics,
    rig,
    step(times = 1): void {
      for (let i = 0; i < times; i++) world.physics.step(FIXED_TIMESTEP);
    },
    destroy(): void {
      bodies.destroy(rig);
      world.destroy();
    },
  };
}
