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
  type Point3,
  type SurfaceFeel,
  type SurfaceProbe,
  Surfaces,
  TyreSound,
} from '@hexrace/car';
import { type GameObject, type Scene } from '@hexrace/engine';
import { EnvironmentCatalog, type EnvironmentId } from '@hexrace/tile';

/** Where a car is put down, what reads the ground under it, and the surface when nothing does. */
export interface CarGrounding {
  readonly environment: EnvironmentId;
  readonly probe: SurfaceProbe | null;
  readonly home: Point3;
}

/** One car in a scene: the object to destroy, and every part a page drives or listens to. */
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
 * Assembles the car every driving page shares, the showcase and the game alike: one object
 * carrying its controller, its meshes, its marks, its dust and its three sound layers, each
 * reading the controller's readout and none of them the others. The sound palette is every
 * surface of every environment, so changing ground does not silence a voice. The grounding comes
 * in with the rest: a component wakes the moment it is added, and its body is built from `home`.
 */
@Injectable({ providedIn: 'root' })
export class CarScene {
  private readonly surfaces = inject(Surfaces);
  private readonly environments = inject(EnvironmentCatalog);

  /** Every distinct surface the game can put under a wheel: one sound voice each. */
  readonly palette: readonly SurfaceFeel[] = [
    ...new Set(this.environments.ids.flatMap((id: EnvironmentId) => this.surfaces.palette(id))),
  ];

  car(scene: Scene, spec: CarSpec, options: CarOptions, ground: CarGrounding): BuiltCar {
    const car = scene.instantiate(CarController);
    car.spec = spec;
    car.options = options;
    car.probe = ground.probe;
    car.home = ground.home;
    car.defaultSurface = { environment: ground.environment, zone: 'road', rank: 1 };
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
