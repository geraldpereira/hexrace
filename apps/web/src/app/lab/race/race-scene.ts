import { Injectable, inject } from '@angular/core';
import { type CarOptions, type CarSpec } from '@hexrace/car';
import { type Scene } from '@hexrace/engine';
import { RaceDirector, TrackStage } from '@hexrace/game-commons';

import { type BuiltCar, CarScene } from '@ui/lab/car/car-scene';

/** The race in the scene: the track it is run on, the car of the car showcase, and the director. */
export interface BuiltRace {
  readonly stage: TrackStage;
  readonly director: RaceDirector;
  readonly parts: BuiltCar;
}

/**
 * Assembles the race's scene in the order the director expects: an empty stage first, because the
 * track is chosen afterwards, then the car of `lab/car` with its marks, its dust and its sounds,
 * then the director, which is given both and ticks last. No ground is laid: the track is the
 * ground, and the director plugs its probe under the wheels when the scene starts.
 */
@Injectable({ providedIn: 'root' })
export class RaceScene {
  private readonly cars = inject(CarScene);

  build(scene: Scene, spec: CarSpec, options: CarOptions): BuiltRace {
    const stage = scene.instantiate(TrackStage);
    scene.spawn('track').add(stage);
    const director = scene.instantiate(RaceDirector);
    director.stage = stage;
    const parts = this.cars.car(scene, spec, options, 'europe');
    director.car = parts.car;
    scene.spawn('race').add(director);
    return { stage, director, parts };
  }
}
