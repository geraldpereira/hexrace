import { TestBed } from '@angular/core/testing';
import { CarController } from '@hexrace/car';
import { FIXED_TIMESTEP, type GameObject, JoltPhysics, type Scene, Scenes } from '@hexrace/engine';
import { Inputs } from '@hexrace/inputs';
import { type Track, TrackWindow } from '@hexrace/track';

import { type RaceRules } from '@game-commons/entity/race-rules';
import { RaceDirector } from '@game-commons/stage/race-director';
import { TrackStage } from '@game-commons/stage/track-stage';

export interface RaceWorld {
  physics: JoltPhysics;
  scene: Scene;
  stage: TrackStage;
  car: CarController;
  director: RaceDirector;
  inputs: Inputs;
  tiles: GameObject;
  step(times?: number): void;
  teleport(position: number, turn?: number, offset?: number): void;
  jump(position: number, turn?: number, offset?: number): void;
  drop(depth: number): void;
  destroy(): void;
}

function buildStage(scene: Scene, track: Track | null): { stage: TrackStage; tiles: GameObject } {
  const stage = scene.instantiate(TrackStage);
  if (track) stage.load(track);
  const tiles = scene.spawn('track');
  tiles.add(stage);
  return { stage, tiles };
}

function buildCar(scene: Scene): CarController {
  const car = scene.instantiate(CarController);
  scene.spawn('car').add(car);
  return car;
}

interface Rails {
  readonly track: Track | null;
  readonly stage: TrackStage;
  readonly car: CarController;
  readonly director: RaceDirector;
  readonly step: () => void;
}

type Mover = Pick<RaceWorld, 'jump' | 'teleport'>;

function mover(rails: Rails): Mover {
  const window = TestBed.inject(TrackWindow);
  const { track, stage, car, director, step } = rails;
  function jump(position: number, turn = 0, offset = 0): void {
    const pose = track && window.playerPose(track, stage.placement, position);
    if (!pose) return;
    const across = pose.travel.right().scale(offset);
    car.home = stage.metres(pose.point.add(across), pose.height);
    car.homeHeading = Math.atan2(pose.travel.x, -pose.travel.y) + turn;
    car.reset();
    step();
  }
  return {
    jump,
    teleport(position: number, turn = 0, offset = 0): void {
      const from = director.state.position;
      const hops = Math.max(1, Math.ceil(Math.abs(position - from)));
      for (let hop = 1; hop <= hops; hop++) {
        jump(from + ((position - from) * hop) / hops, turn, offset);
      }
    },
  };
}

export async function raceWorld(track: Track | null, rules?: RaceRules): Promise<RaceWorld> {
  const physics = TestBed.inject(JoltPhysics);
  await physics.load();
  const scene = TestBed.inject(Scenes).create();
  const { stage, tiles } = buildStage(scene, track);

  const director = scene.instantiate(RaceDirector);
  director.stage = stage;
  director.rules = rules ?? { mode: track?.mode ?? 'track', laps: track?.laps ?? 2 };
  const car = buildCar(scene);
  director.car = car;
  scene.spawn('race').add(director);
  scene.start();

  function step(times = 1): void {
    for (let i = 0; i < times; i++) {
      scene.fixedUpdate();
      physics.step(FIXED_TIMESTEP);
      scene.render(FIXED_TIMESTEP);
    }
  }

  return {
    physics,
    scene,
    stage,
    car,
    director,
    tiles,
    inputs: TestBed.inject(Inputs),
    step,
    ...mover({ track, stage, car, director, step }),
    drop(depth: number): void {
      car.home = { x: car.position.x, y: depth, z: car.position.z };
      car.reset();
      step();
    },
    destroy(): void {
      scene.destroy();
    },
  };
}
