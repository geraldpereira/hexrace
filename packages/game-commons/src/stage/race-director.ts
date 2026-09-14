import { inject } from '@angular/core';
import { type CarController } from '@hexrace/car';
import { EventBus, type Vec2 } from '@hexrace/commons';
import { GameComponent } from '@hexrace/engine';
import { type Placement, type Track, TrackLocator, TrackWindow } from '@hexrace/track';

import { type RaceRules, DEFAULT_RACE_RULES } from '@game-commons/entity/race-rules';
import { type RaceState, IDLE_RACE_STATE } from '@game-commons/entity/race-state';
import { type SpawnPose } from '@game-commons/entity/spawn-pose';
import { RaceMachine } from '@game-commons/race/race-machine';
import { FallWatch } from '@game-commons/stage/fall-watch';
import { TrackProbe } from '@game-commons/stage/track-probe';
import { type TrackStage } from '@game-commons/stage/track-stage';

const TILE_MIDDLE = 0.5;
const PAST_THE_LINE = 0.02;
const WRONG_WAY_MPS = 5;

/**
 * What marries the track and the car (functional spec 4.1): each step it finds where the car
 * stands, moves the tile window with it, aims the camera at the next tile, calls the wrong way,
 * holds the car still under the countdown, runs the race, and puts the car back on the last tile
 * driven when it falls off (2.7 and 3.8); `restart` parks it on the start line. Set `stage`, `car`
 * and `rules`; it plugs the `TrackProbe` in, and past the first tile found every pose exists.
 */
export class RaceDirector extends GameComponent {
  stage!: TrackStage;
  car!: CarController;
  rules: RaceRules = DEFAULT_RACE_RULES;
  /** Under this speed nothing is called a wrong way, in m/s. */
  wrongWaySpeed = WRONG_WAY_MPS;

  readonly state: RaceState = { ...IDLE_RACE_STATE };

  private readonly bus = inject(EventBus);
  private readonly fall = inject(FallWatch);
  private readonly locator = inject(TrackLocator);
  private readonly machine = inject(RaceMachine);
  private readonly probe = inject(TrackProbe);
  private readonly window = inject(TrackWindow);
  private lastTile = 0;

  /** Where the car is put down: on the start line, just past it, so its first crossing is a lap. */
  spawnPose(): SpawnPose | null {
    const track = this.stage.track;
    if (!track) return null;
    const pose = this.window.playerPose(track, this.stage.placement, this.startPosition(track));
    if (!pose) return null;
    return {
      point: this.stage.metres(pose.point, pose.height),
      heading: this.headingOf(pose.travel),
    };
  }

  /** Puts the race back at the countdown, the window around the start line and the car on it. */
  restart(): void {
    const track = this.stage.track;
    this.machine.track = track;
    this.machine.rules = this.rules;
    const position = track ? this.startPosition(track) : 0;
    this.lastTile = Math.floor(position);
    this.machine.start(this.state, position);
    this.stage.follow(this.lastTile);
    this.park(this.spawnPose());
  }

  override start(): void {
    this.probe.stage = this.stage;
    this.car.probe = this.probe;
    this.restart();
  }

  override fixedUpdate(): void {
    const track = this.stage.track;
    if (!track) return;
    const placement = this.stage.placement;
    const where = this.stage.plane(this.car.position);
    const spot = this.locator.locate(track, placement, where, this.lastTile);
    if (spot) {
      this.lastTile = spot.placed.index;
      this.stage.follow(spot.placed.index);
      this.aim(track, placement, spot.placed.index);
      this.state.wrongWay = this.wrongWay(track, placement, spot.position);
    }
    this.machine.update(this.state, spot?.position ?? this.state.position);
    this.car.frozen = this.state.phase === 'countdown';
    if (this.fall.fallen(track, this.car.position.y)) this.recover(track, placement);
  }

  private startPosition(track: Track): number {
    return this.machine.startLine(track) + PAST_THE_LINE;
  }

  private aim(track: Track, placement: Placement, index: number): void {
    const pose = this.window.playerPose(track, placement, index + 1 + TILE_MIDDLE)!;
    this.car.nextTile = this.stage.metres(pose.point, pose.height);
  }

  private wrongWay(track: Track, placement: Placement, position: number): boolean {
    if (this.car.speed < this.wrongWaySpeed) return false;
    const pose = this.window.playerPose(track, placement, position)!;
    return Math.cos(this.car.heading - this.headingOf(pose.travel)) < 0;
  }

  private recover(track: Track, placement: Placement): void {
    const pose = this.window.playerPose(track, placement, this.lastTile + TILE_MIDDLE)!;
    this.park({
      point: this.stage.metres(pose.point, pose.height),
      heading: this.headingOf(pose.travel),
    });
    this.bus.publish('race/fall', { tile: this.lastTile });
  }

  private park(pose: SpawnPose | null): void {
    if (!pose) return;
    this.car.home = pose.point;
    this.car.homeHeading = pose.heading;
    this.car.reset();
  }

  private headingOf(travel: Vec2): number {
    return Math.atan2(travel.x, -travel.y);
  }
}
