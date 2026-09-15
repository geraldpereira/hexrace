import { Injectable, inject } from '@angular/core';

import { type FollowCamera } from '@hexrace/camera';
import { type CarOptions, type CarSpec } from '@hexrace/car';
import { type CameraComponent, LightComponent, type Scene } from '@hexrace/engine';
import { RaceDirector, TrackStage } from '@hexrace/game-commons';

import { type BuiltCar, CarScene } from '@ui/scene/car-scene';
import { InputPoller } from '@ui/scene/input-poller';

/** The race in the scene: the track it is run on, the car it is run with, and the director. */
export interface BuiltRace {
  readonly stage: TrackStage;
  readonly director: RaceDirector;
  readonly parts: BuiltCar;
}

/**
 * Assembles a race's scene in the order the director expects: the input poller first, so every
 * other component sees this step's actions, then the light, an empty stage because the track is
 * chosen afterwards, then the car with its marks, its dust and its sounds, then the director,
 * which is given both and ticks last. No ground is laid: the track is the ground, and the
 * director plugs its probe under the wheels when the scene starts.
 */
@Injectable({ providedIn: 'root' })
export class RaceScene {
  private readonly cars = inject(CarScene);

  build(
    scene: Scene,
    spec: CarSpec,
    options: CarOptions,
    eye: CameraComponent,
    follow: FollowCamera,
  ): BuiltRace {
    scene.spawn('inputs', InputPoller);
    scene.spawn('sun', LightComponent);
    const stage = scene.instantiate(TrackStage);
    scene.spawn('track').add(stage);
    const director = scene.instantiate(RaceDirector);
    director.stage = stage;
    const parts = this.cars.car(scene, spec, options, {
      environment: 'europe',
      probe: null,
      home: { x: 0, y: 0, z: 0 },
    });
    director.car = parts.car;
    scene.spawn('race').add(director);
    parts.particles.camera = eye.camera;
    follow.target = parts.car;
    return { stage, director, parts };
  }
}
