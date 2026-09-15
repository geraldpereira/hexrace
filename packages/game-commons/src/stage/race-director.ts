import { inject } from '@angular/core';
import { type CarController } from '@hexrace/car';
import { EventBus, type Vec2 } from '@hexrace/commons';
import { GameComponent } from '@hexrace/engine';
import {
  type Placement,
  type Track,
  type TrackSpot,
  TrackLocator,
  TrackProfiles,
  TrackWindow,
} from '@hexrace/track';

import { type RaceRules, DEFAULT_RACE_RULES } from '@game-commons/entity/race-rules';
import { type RaceState, IDLE_RACE_STATE } from '@game-commons/entity/race-state';
import { type SpawnPose } from '@game-commons/entity/spawn-pose';
import { LapCounter } from '@game-commons/race/lap-counter';
import { RaceMachine } from '@game-commons/race/race-machine';
import { FallWatch } from '@game-commons/stage/fall-watch';
import { SpawnSpots } from '@game-commons/stage/spawn-spots';
import { TrackProbe } from '@game-commons/stage/track-probe';
import { type TrackStage } from '@game-commons/stage/track-stage';

const TILE_MIDDLE = 0.5;
const PAST_THE_LINE = 0.02;
const WRONG_WAY_MPS = 5;
const LOOK_AHEAD_TILES = 1;

/**
 * What marries the track and the car (functional spec 4.1): each step it finds where the car
 * stands, moves the tile window with it, aims the camera one tile ahead of it, calls the wrong way,
 * holds the car still under the countdown, runs the race, and puts the car back on the last tile
 * driven when it falls off or when it cut a corner and skipped a tile (2.7 and 3.8); `restart`
 * parks it on the start line. Set `stage`, `car` and `rules`; it plugs the `TrackProbe` in.
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
  private readonly laps = inject(LapCounter);
  private readonly locator = inject(TrackLocator);
  private readonly machine = inject(RaceMachine);
  private readonly probe = inject(TrackProbe);
  private readonly profiles = inject(TrackProfiles);
  private readonly spawns = inject(SpawnSpots);
  private readonly window = inject(TrackWindow);
  private lastTile = 0;

  /** Where the car is put down: on the start line, just past it, so its first crossing is a lap. */
  spawnPose(): SpawnPose | null {
    const track = this.stage.track;
    return track ? this.poseAt(this.startPosition(track)) : null;
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
    const cut = this.cut(track, spot);
    const here = cut === null ? spot : null;
    if (here) this.adopt(track, placement, here);
    this.machine.update(this.state, here?.position ?? this.state.position);
    this.car.frozen = this.state.phase === 'countdown';
    this.settle(track, cut);
  }

  private startPosition(track: Track): number {
    return this.machine.startLine(track) + PAST_THE_LINE;
  }

  private adopt(track: Track, placement: Placement, spot: TrackSpot): void {
    const index = spot.placed.index;
    if (index !== this.lastTile) this.homeAt(this.poseAt(index + TILE_MIDDLE)!);
    this.lastTile = index;
    this.stage.follow(index);
    this.aim(track, placement, spot.position);
    this.state.wrongWay = this.wrongWay(track, placement, spot.position);
  }

  private cut(track: Track, spot: TrackSpot | null): number | null {
    if (!spot) return null;
    const index = spot.placed.index;
    const total = this.stage.placement.tiles.length;
    const gap = this.profiles.isClosed(track)
      ? this.laps.step(this.lastTile, index, total)
      : index - this.lastTile;
    return Math.abs(gap) > 1 ? index : null;
  }

  private settle(track: Track, cut: number | null): void {
    if (this.fall.fallen(track, this.car.position.y)) {
      this.recover();
      this.bus.publish('race/fall', { tile: this.lastTile });
    } else if (cut !== null) {
      this.recover();
      this.bus.publish('race/cut', { from: this.lastTile, to: cut });
    }
  }

  private aim(track: Track, placement: Placement, position: number): void {
    const pose = this.window.playerPose(track, placement, position + LOOK_AHEAD_TILES)!;
    this.car.nextTile = this.stage.metres(pose.point, pose.height);
  }

  private wrongWay(track: Track, placement: Placement, position: number): boolean {
    if (this.car.speed < this.wrongWaySpeed) return false;
    const pose = this.window.playerPose(track, placement, position)!;
    return Math.cos(this.car.heading - this.headingOf(pose.travel)) < 0;
  }

  private recover(): void {
    this.park(this.poseAt(this.lastTile + TILE_MIDDLE));
  }

  private poseAt(position: number): SpawnPose | null {
    const index = Math.floor(position);
    const build = this.stage.builds[index];
    return build ? this.spawns.pose(build, position - index) : null;
  }

  private park(pose: SpawnPose | null): void {
    if (!pose) return;
    this.homeAt(pose);
    this.car.reset();
  }

  private homeAt(pose: SpawnPose): void {
    this.car.home = pose.point;
    this.car.homeHeading = pose.heading;
  }

  private headingOf(travel: Vec2): number {
    return Math.atan2(travel.x, -travel.y);
  }
}
