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
import { type CameraComponent, type GameObject, LightComponent } from '@hexrace/engine';
import { AssistLamps, CanvasFrame, type DebugFolder, TouchPaddles } from '@hexrace/hud';
import { Inputs, TouchSource } from '@hexrace/inputs';
import { type EnvironmentId } from '@hexrace/tile';

import { BENCH_TITLE, type CarBench } from '@ui/lab/car/car-bench';
import { CarGround } from '@ui/lab/car/car-ground';
import { CarObstacles } from '@ui/lab/car/car-obstacles';
import { CarPanel } from '@ui/lab/car/car-panel';
import { LaneProbe } from '@ui/lab/car/lane-probe';
import { DEFAULT_OBSTACLES, type ObstacleSpec } from '@ui/lab/car/obstacle-spec';
import { PhysicsLab } from '@ui/lab/lab-scene';
import { CarDash } from '@ui/scene/car-dash';
import { CarGauges } from '@ui/scene/car-gauges';
import { CarScene } from '@ui/scene/car-scene';
import { InputPoller } from '@ui/scene/input-poller';

/**
 * POC 1 redone (plan de construction 2.7): the car on a flat ground cut into one lane per rank of
 * an environment, with the ramp and the speed bump, driven with the pad, the keys or the touch
 * paddles, followed by the camera of the spec, with the rev counter, the gear, the speed and the
 * assist lamps over it and every knob of the model, the garage and the effects in the panel.
 */
@Component({
  selector: 'hr-car-showcase',
  imports: [RouterLink, CanvasFrame, TouchPaddles, CarGauges, AssistLamps],
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

  readonly dash = new CarDash();
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
  private readonly grounds = inject(CarGround);
  private readonly obstacleBuilder = inject(CarObstacles);
  private readonly probe = new LaneProbe();
  private readonly surfaces = inject(Surfaces);
  private readonly hub = inject(AudioHub);
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
    const built = this.grounds.build(this.scene, this.environment);
    this.ground = built.object;
    this.probe.lanes = this.surfaces.of(this.environment);
    this.probe.laneWidth = built.laneWidth;
    this.rebuildObstacles();
  }

  rebuildObstacles(): void {
    for (const object of this.obstacleObjects) object.destroy();
    this.obstacleObjects = this.obstacleBuilder.build(this.scene, this.obstacles);
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
    this.eye = this.followCamera(this.follow);
    this.buildCar();
    this.dash.options = this.options;
    this.status.set('Throttle, brake, steer. Hold R or Y for three seconds to reset.');
    this.showPanel(BENCH_TITLE, (folder: DebugFolder) => {
      this.carPanel.build(folder, this);
    });
  }

  protected render(dt: number): void {
    this.frame(dt);
    this.dash.read(this.car.state);
    this.renderer.render(this.eye.camera);
  }

  private buildCar(): void {
    const built = this.builder.car(this.scene, this.spec, this.options, {
      environment: this.environment,
      probe: this.probe,
      home: { x: this.probe.centreOf(0), y: 0, z: 0 },
    });
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
