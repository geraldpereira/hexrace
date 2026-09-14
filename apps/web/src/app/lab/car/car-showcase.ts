import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  type OnInit,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FollowCamera } from '@hexrace/camera';
import {
  AudioHub,
  type CarController,
  type CarOptions,
  type CarParticles,
  type CarSpec,
  type CarView,
  type ChassisSound,
  DEFAULT_CAR_OPTIONS,
  DEFAULT_CAR_SPEC,
  type EngineSound,
  type SkidMarks,
  Surfaces,
  type TyreSound,
} from '@hexrace/car';
import { CameraComponent, type GameObject, LightComponent } from '@hexrace/engine';
import {
  AssistLamps,
  type AssistReadout,
  CanvasFrame,
  type DebugFolder,
  DebugPanel,
  GearIndicator,
  RevCounter,
  SpeedIndicator,
  TouchPaddles,
} from '@hexrace/hud';
import { Inputs, TouchSource } from '@hexrace/inputs';
import { type EnvironmentId } from '@hexrace/tile';

import { BENCH_TITLE, type CarBench } from '@ui/lab/car/car-bench';
import { CarPanel } from '@ui/lab/car/car-panel';
import { CarScene } from '@ui/lab/car/car-scene';
import { DEFAULT_OBSTACLES, type ObstacleSpec } from '@ui/lab/car/obstacle-spec';
import { InputPoller } from '@ui/lab/car/input-poller';
import { PhysicsLab } from '@ui/lab/lab-scene';

/**
 * POC 1 redone (plan de construction 2.7): the car on a flat ground cut into one lane per rank of
 * an environment, with the ramp and the speed bump, driven with the pad, the keys or the touch
 * paddles, followed by the camera of the spec, with the rev counter, the gear, the speed and the
 * assist lamps over it and every knob of the model, the garage and the effects in the panel.
 */
@Component({
  selector: 'hr-car-showcase',
  imports: [
    RouterLink,
    CanvasFrame,
    TouchPaddles,
    RevCounter,
    GearIndicator,
    SpeedIndicator,
    AssistLamps,
  ],
  templateUrl: './car-showcase.html',
  styleUrl: './car-showcase.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarShowcase extends PhysicsLab implements OnInit, CarBench {
  readonly touch = inject(TouchSource);
  readonly inputs = inject(Inputs);
  readonly spec: CarSpec = structuredClone(DEFAULT_CAR_SPEC);
  readonly options: CarOptions = structuredClone(DEFAULT_CAR_OPTIONS);
  readonly obstacles: ObstacleSpec = { ...DEFAULT_OBSTACLES };
  environment: EnvironmentId = 'europe';

  readonly rpm = signal(0);
  readonly gear = signal(0);
  readonly kmh = signal(0);
  readonly limiter = signal(false);
  readonly shiftHint = signal(false);
  readonly assists = signal<AssistReadout>({ abs: null, tractionControl: null });
  readonly palette = inject(CarScene).palette;
  readonly status = signal('Loading the physics…');

  car!: CarController;
  view!: CarView;
  marks!: SkidMarks;
  particles!: CarParticles;
  engineSound!: EngineSound;
  tyreSound!: TyreSound;
  chassisSound!: ChassisSound;

  private readonly builder = inject(CarScene);
  private readonly carPanel = inject(CarPanel);
  private readonly surfaces = inject(Surfaces);
  private readonly hub = inject(AudioHub);
  private readonly panel = inject(DebugPanel);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  readonly showPaddles = signal(this.prefersTouch());
  private readonly follow = this.scene.instantiate(FollowCamera);
  private ground: GameObject | null = null;
  private obstacleObjects: GameObject[] = [];
  private carObject: GameObject | null = null;
  private eye!: CameraComponent;

  constructor() {
    super();
    this.destroyRef.onDestroy(() => {
      this.leave();
    });
  }

  ngOnInit(): void {
    this.load();
  }

  rebuildCar(): void {
    this.carObject?.destroy();
    this.buildCar();
    this.follow.snap();
  }

  rebuildGround(): void {
    this.ground?.destroy();
    this.ground = this.builder.ground(this.scene, this.environment);
    this.builder.probe.lanes = this.surfaces.of(this.environment);
    this.rebuildObstacles();
  }

  rebuildObstacles(): void {
    for (const object of this.obstacleObjects) object.destroy();
    this.obstacleObjects = this.builder.obstacles(this.scene, this.obstacles);
  }

  startSound(): void {
    this.hub.unlock();
  }

  drop(): void {
    this.dropCrate(4);
  }

  protected start(): void {
    this.scene.spawn('inputs', InputPoller);
    this.scene.spawn('sun', LightComponent);
    this.rebuildGround();
    const camera = this.scene.spawn('camera', CameraComponent);
    camera.add(this.follow);
    this.eye = camera.getOrThrow(CameraComponent);
    this.camera = this.eye;
    this.eye.setAspect(this.renderer.width, this.renderer.height);
    this.buildCar();
    this.status.set('Throttle, brake, steer. Hold R or Y for three seconds to reset.');
    this.panel.register(
      BENCH_TITLE,
      (folder: DebugFolder) => {
        this.carPanel.build(folder, this);
      },
      this.destroyRef,
    );
    this.panel.show();
  }

  protected render(dt: number): void {
    this.frame(dt);
    const state = this.car.state;
    this.rpm.set(Math.round(state.rpm));
    this.gear.set(state.gear);
    this.kmh.set(Math.round(state.speedKmh));
    this.limiter.set(state.limiter);
    this.shiftHint.set(state.shiftHint);
    this.assists.set({
      abs: this.options.abs.enabled ? state.absCut > 0.01 : null,
      tractionControl: this.options.tractionControl.enabled ? state.tractionCut > 0.01 : null,
    });
    this.renderer.render(this.eye.camera);
  }

  private buildCar(): void {
    const built = this.builder.car(this.scene, this.spec, this.options, this.environment);
    this.carObject = built.object;
    this.car = built.car;
    this.view = built.view;
    this.marks = built.marks;
    this.particles = built.particles;
    this.engineSound = built.engineSound;
    this.tyreSound = built.tyreSound;
    this.chassisSound = built.chassisSound;
    this.particles.camera = this.eye.camera;
    this.follow.target = this.car;
  }

  private prefersTouch(): boolean {
    const view = this.document.defaultView as Window;
    return view.matchMedia('(pointer: coarse)').matches;
  }
}
