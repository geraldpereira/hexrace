import { TestBed } from '@angular/core/testing';
import { Clock, EventBus } from '@hexrace/commons';
import { TileSurfaces } from '@hexrace/tile';
import { type Track, TrackExamples } from '@hexrace/track';

import { type RaceCut, type RaceFall } from '@game-commons/entity/race-events';
import { rallyTrack } from '@game-commons/entity/track.mock';
import { FakeClock } from '@game-commons/race/clock.mock';
import { type RaceWorld, raceWorld } from '@game-commons/stage/race-world.mock';

describe('RaceDirector', () => {
  let clock: FakeClock;
  let world: RaceWorld;
  const falls: RaceFall[] = [];
  const cuts: RaceCut[] = [];

  beforeEach(() => {
    localStorage.clear();
    clock = new FakeClock();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: Clock, useValue: clock }] });
    falls.length = 0;
    cuts.length = 0;
    TestBed.inject(EventBus).on('race/fall', (event: RaceFall) => falls.push(event));
    TestBed.inject(EventBus).on('race/cut', (event: RaceCut) => cuts.push(event));
  });

  afterEach(() => {
    world.destroy();
  });

  function ring(): Track {
    return TestBed.inject(TrackExamples).of('europe-loop-01')!;
  }

  function go(): void {
    clock.tick(3);
    world.step();
  }

  it('puts the car on the start line, just past it, facing the way the track goes', async () => {
    const track = ring();
    world = await raceWorld(track);
    const pose = world.director.spawnPose()!;
    expect(pose.point.y).toBeCloseTo(40 * 0.2, 6);
    expect(world.car.home).toEqual(pose.point);
    expect(world.car.homeHeading).toBeCloseTo(pose.heading, 9);
    world.step();
    expect(world.director.state.position).toBeGreaterThan(0.5);
    expect(world.director.state.position).toBeLessThan(0.6);
  });

  it('holds the car still until the GO, then lets it go', async () => {
    world = await raceWorld(ring());
    world.inputs.actions.throttle = 1;
    world.step(60);
    expect(world.director.state.phase).toBe('countdown');
    expect(world.car.frozen).toBe(true);
    expect(world.car.state.speedKmh).toBeLessThan(1);
    go();
    expect(world.director.state.phase).toBe('racing');
    expect(world.car.frozen).toBe(false);
    world.step(120);
    expect(world.car.state.speedKmh).toBeGreaterThan(5);
    clock.tick(2);
    world.step();
    expect(world.director.state.elapsedMs).toBe(2000);
  });

  it('keeps only the window of tiles around the car, and aims at the next one', async () => {
    const track = ring();
    world = await raceWorld(track);
    world.stage.ahead = 2;
    world.stage.behind = 1;
    go();
    world.teleport(4.5);
    world.step();
    expect([...world.stage.shown].sort((a: number, b: number) => a - b)).toEqual([3, 4, 5, 6]);
    const next = world.car.nextTile;
    expect(next).not.toBeNull();
    expect(world.director.state.position).toBeCloseTo(4.5, 1);
    world.teleport(7.5);
    world.step();
    expect([...world.stage.shown].sort((a: number, b: number) => a - b)).toEqual([6, 7, 8, 9]);
    expect(world.car.nextTile).not.toEqual(next);
  });

  it('calls the wrong way only when the car faces against the track and moves', async () => {
    world = await raceWorld(rallyTrack(6));
    go();
    world.teleport(2.5);
    world.step();
    expect(world.director.state.wrongWay).toBe(false);
    world.director.wrongWaySpeed = 0;
    world.teleport(2.5, Math.PI);
    world.step();
    expect(world.director.state.wrongWay).toBe(true);
    world.teleport(2.5, 0);
    world.step();
    expect(world.director.state.wrongWay).toBe(false);
  });

  it('puts the car back on the last tile it drove when it falls off the terrain', async () => {
    const track = rallyTrack(6);
    world = await raceWorld(track);
    go();
    world.teleport(3.5);
    world.step();
    world.drop(-200);
    world.step(2);
    expect(falls).toEqual([{ tile: 3 }]);
    expect(world.car.position.y).toBeGreaterThan(-10);
    expect(world.director.state.phase).toBe('racing');
  });

  it('runs a rally to its finish line and saves the time', async () => {
    const track = rallyTrack(6);
    world = await raceWorld(track);
    go();
    clock.tick(20);
    world.teleport(5.6);
    world.step();
    expect(world.director.state.phase).toBe('finished');
    expect(world.director.state.elapsedMs).toBeCloseTo(20_000, -2);
    expect(localStorage.length).toBe(1);
  });

  it('starts over on demand, back to the countdown at the start line', async () => {
    const track = rallyTrack(6);
    world = await raceWorld(track);
    go();
    const line = world.car.home;
    world.inputs.actions.throttle = 1;
    world.teleport(3.5);
    world.step(30);
    expect(world.car.state.speedKmh).toBeGreaterThan(1);
    world.director.restart();
    expect(world.director.state.phase).toBe('countdown');
    expect(world.director.state.position).toBeCloseTo(0.52, 9);
    expect(world.director.state.elapsedMs).toBe(0);
    expect(world.car.home).toEqual(line);
    world.step();
    expect(world.director.state.position).toBeCloseTo(0.52, 1);
    expect(world.car.state.speedKmh).toBeLessThan(1);
  });

  it('puts the car back where it was when it skipped a tile rather than drove it', async () => {
    world = await raceWorld(rallyTrack(8));
    go();
    world.teleport(2.5);
    expect(world.director.state.position).toBeCloseTo(2.5, 1);
    world.jump(4.5);
    expect(cuts).toEqual([{ from: 2, to: 4 }]);
    expect(falls).toEqual([]);
    world.step();
    expect(world.director.state.position).toBeCloseTo(2.5, 1);
  });

  it('takes the next tile, the one before, and the wrap of a loop, as driven', async () => {
    world = await raceWorld(ring());
    go();
    world.teleport(2.5);
    world.jump(3.5);
    world.jump(2.5);
    expect(cuts).toEqual([]);
    const last = world.stage.track!.tiles.length - 1;
    world.teleport(last + 0.5);
    world.jump(0.5);
    expect(cuts).toEqual([]);
    expect(world.director.state.position).toBeCloseTo(0.5, 1);
  });

  it('calls a cut on a loop when the short way round skips a tile', async () => {
    world = await raceWorld(ring());
    go();
    world.teleport(1.5);
    const last = world.stage.track!.tiles.length - 1;
    world.jump(last + 0.5);
    expect(cuts).toEqual([{ from: 1, to: last }]);
  });

  it('calls a fall and not a cut when the car is fished out of the void', async () => {
    world = await raceWorld(rallyTrack(6));
    go();
    world.teleport(3.5);
    world.drop(-200);
    world.step(2);
    expect(falls).toEqual([{ tile: 3 }]);
    expect(cuts).toEqual([]);
  });

  it('aims a tile ahead of where the car stands, and slides the point with it', async () => {
    world = await raceWorld(rallyTrack(6));
    go();
    world.teleport(1.99);
    const before = world.car.nextTile!;
    world.jump(2.01);
    const after = world.car.nextTile!;
    const moved = Math.hypot(after.x - before.x, after.z - before.z);
    world.jump(3.01);
    const far = world.car.nextTile!;
    expect(moved).toBeLessThan(Math.hypot(far.x - after.x, far.z - after.z) / 4);
  });

  it('counts the finish line crossed off the road, anywhere across the hexagon', async () => {
    world = await raceWorld(rallyTrack(6));
    go();
    world.teleport(5.45, 0, 3.5);
    const build = world.stage.builds[5]!;
    const under = TestBed.inject(TileSurfaces).at(
      build.sweep,
      world.stage.plane(world.car.position),
    );
    expect(under?.zone).toBe('landscape');
    expect(world.director.state.phase).toBe('racing');
    world.jump(5.55, 0, 3.5);
    expect(world.director.state.phase).toBe('finished');
  });

  it('stands by while no track is laid, and spawns nowhere on a track without a tile', async () => {
    world = await raceWorld(null);
    expect(world.director.spawnPose()).toBeNull();
    world.step(2);
    expect(world.director.state.phase).toBe('countdown');
    world.stage.load(rallyTrack(0));
    expect(world.director.spawnPose()).toBeNull();
    world.step(2);
    expect(world.director.state.position).toBe(0);
  });
});
