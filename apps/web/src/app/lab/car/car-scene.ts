import { Injectable, inject } from '@angular/core';
import {
  CarController,
  CarParticles,
  type CarOptions,
  type CarSpec,
  CarView,
  ChassisSound,
  EngineSound,
  SkidMarks,
  type SurfaceFeel,
  Surfaces,
  TyreSound,
} from '@hexrace/car';
import { type GameObject, type Scene } from '@hexrace/engine';
import { EnvironmentCatalog, type EnvironmentId } from '@hexrace/tile';

import { CarGround } from '@ui/lab/car/car-ground';
import { CarObstacles } from '@ui/lab/car/car-obstacles';
import { LaneProbe } from '@ui/lab/car/lane-probe';
import { type ObstacleSpec } from '@ui/lab/car/obstacle-spec';

/** One car in the showcase's scene: the object to destroy, and every part the panel drives. */
export interface BuiltCar {
  readonly object: GameObject;
  readonly car: CarController;
  readonly view: CarView;
  readonly marks: SkidMarks;
  readonly particles: CarParticles;
  readonly engineSound: EngineSound;
  readonly tyreSound: TyreSound;
  readonly chassisSound: ChassisSound;
}

/**
 * Assembles the showcase's scene: the painted ground and its lane probe, the two obstacles, and
 * the car as one object carrying its controller, its meshes, its marks, its dust and its three
 * sound layers, each reading the controller's readout and none of them the others. The sound
 * palette is every surface of every environment, so switching ground does not silence a voice.
 */
@Injectable({ providedIn: 'root' })
export class CarScene {
  readonly probe = new LaneProbe();

  private readonly grounds = inject(CarGround);
  private readonly obstacleBuilder = inject(CarObstacles);
  private readonly surfaces = inject(Surfaces);
  private readonly environments = inject(EnvironmentCatalog);

  /** Every distinct surface the game can put under a wheel: one sound voice each. */
  readonly palette: readonly SurfaceFeel[] = [
    ...new Set(this.environments.ids.flatMap((id: EnvironmentId) => this.surfaces.palette(id))),
  ];

  ground(scene: Scene, environment: EnvironmentId): GameObject {
    const built = this.grounds.build(scene, environment);
    this.probe.lanes = built.lanes;
    this.probe.laneWidth = built.laneWidth;
    return built.object;
  }

  obstacles(scene: Scene, spec: ObstacleSpec): GameObject[] {
    return this.obstacleBuilder.build(scene, spec);
  }

  car(scene: Scene, spec: CarSpec, options: CarOptions, environment: EnvironmentId): BuiltCar {
    const car = scene.instantiate(CarController);
    car.spec = spec;
    car.options = options;
    car.probe = this.probe;
    car.defaultSurface = { environment, zone: 'road', rank: 1 };
    car.home = { x: this.probe.centreOf(0), y: 0, z: 0 };
    const object = scene.spawn('car');
    object.add(car);
    const view = scene.instantiate(CarView);
    view.readout = car;
    view.spec = spec;
    object.add(view);
    const marks = scene.instantiate(SkidMarks);
    marks.readout = car;
    object.add(marks);
    const particles = scene.instantiate(CarParticles);
    particles.readout = car;
    particles.slides = marks;
    object.add(particles);
    return { object, car, view, marks, particles, ...this.sounds(scene, object, car, marks) };
  }

  private sounds(
    scene: Scene,
    object: GameObject,
    car: CarController,
    marks: SkidMarks,
  ): { engineSound: EngineSound; tyreSound: TyreSound; chassisSound: ChassisSound } {
    const engineSound = scene.instantiate(EngineSound);
    engineSound.readout = car;
    object.add(engineSound);
    const tyreSound = scene.instantiate(TyreSound);
    tyreSound.readout = car;
    tyreSound.slides = marks;
    tyreSound.feels = this.palette;
    object.add(tyreSound);
    const chassisSound = scene.instantiate(ChassisSound);
    chassisSound.readout = car;
    chassisSound.feels = this.palette;
    object.add(chassisSound);
    return { engineSound, tyreSound, chassisSound };
  }
}
