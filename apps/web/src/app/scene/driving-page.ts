import { DestroyRef, inject } from '@angular/core';

import { FollowCamera } from '@hexrace/camera';
import {
  type CarOptions,
  type CarSpec,
  DEFAULT_CAR_OPTIONS,
  DEFAULT_CAR_SPEC,
} from '@hexrace/car';
import { EventBus } from '@hexrace/commons';
import { type CameraComponent } from '@hexrace/engine';
import { type RaceFinish } from '@hexrace/game-commons';
import { type RaceMode } from '@hexrace/hud';

import { CarDash } from '@ui/scene/car-dash';
import { RaceReadout } from '@ui/scene/race-readout';
import { type BuiltRace, RaceScene } from '@ui/scene/race-scene';
import { ScenePage } from '@ui/scene/scene-page';

/**
 * A page that runs a race: the showcase of `game-commons` and the game's race screen. It owns the
 * follow camera and the eye, the scene the `RaceScene` builds, the dashboard and the readout the
 * HUD reads each frame, and the subscription to the flag. A subclass lays its track in `ready`,
 * once the scene is up, says which mode the timer shows, and answers `finished` its own way: the
 * showcase goes back to the lab, the game to its front page.
 */
export abstract class DrivingPage extends ScenePage {
  readonly spec: CarSpec = structuredClone(DEFAULT_CAR_SPEC);
  readonly options: CarOptions = structuredClone(DEFAULT_CAR_OPTIONS);
  readonly dash = new CarDash();
  readonly readout = new RaceReadout();

  race!: BuiltRace;

  protected readonly follow = this.scene.instantiate(FollowCamera);
  protected eye!: CameraComponent;
  private readonly races = inject(RaceScene);
  private readonly bus = inject(EventBus);

  constructor() {
    super();
    this.dash.options = this.options;
    const off = this.bus.on('race/finish', (event: RaceFinish) => {
      this.finished(event);
    });
    inject(DestroyRef).onDestroy(() => {
      off();
      this.leave();
    });
  }

  protected start(): void {
    this.eye = this.followCamera(this.follow);
    this.race = this.races.build(this.scene, this.spec, this.options, this.eye, this.follow);
    this.ready();
  }

  protected render(dt: number): void {
    this.frame(dt);
    this.readout.read(this.race.director.state, this.mode);
    this.dash.read(this.race.parts.car.state);
    this.renderer.render(this.eye.camera);
  }

  protected abstract readonly mode: RaceMode;

  protected abstract ready(): void;

  protected abstract finished(event: RaceFinish): void;
}
