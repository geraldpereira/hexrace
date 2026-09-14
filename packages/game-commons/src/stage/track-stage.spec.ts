import { TestBed } from '@angular/core/testing';
import { JoltPhysics, type Scene, Scenes, ThreeRenderer } from '@hexrace/engine';
import { Vec2 } from '@hexrace/commons';
import { UNIT_METERS } from '@hexrace/tile';
import { type Track, TrackExamples } from '@hexrace/track';

import { rallyTrack } from '@game-commons/entity/track.mock';
import { TrackStage } from '@game-commons/stage/track-stage';

describe('TrackStage', () => {
  let scene: Scene;
  let stage: TrackStage;
  let renderer: ThreeRenderer;
  let ring: Track;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    await TestBed.inject(JoltPhysics).load();
    renderer = TestBed.inject(ThreeRenderer);
    scene = TestBed.inject(Scenes).create();
    stage = scene.instantiate(TrackStage);
    scene.spawn('track').add(stage);
    ring = TestBed.inject(TrackExamples).of('europe-ring-01')!;
  });

  afterEach(() => {
    scene.destroy();
  });

  it('holds nothing before a track is laid', () => {
    expect(stage.track).toBeNull();
    expect(stage.placement.tiles).toEqual([]);
    expect(stage.environment).toBeNull();
    expect(stage.builds).toEqual([]);
    stage.follow(0);
    expect(stage.shown.size).toBe(0);
  });

  it('lays a track and builds one tile of it per index', () => {
    stage.load(ring);
    expect(stage.track).toBe(ring);
    expect(stage.placement.tiles).toHaveLength(ring.tiles.length);
    expect(stage.builds).toHaveLength(ring.tiles.length);
    expect(stage.environment?.id).toBe('europe');
  });

  it('keeps only the window in the scene, and moves it with the player', () => {
    stage.load(ring);
    stage.ahead = 2;
    stage.behind = 1;
    stage.follow(5);
    expect([...stage.shown].sort((a: number, b: number) => a - b)).toEqual([4, 5, 6, 7]);
    const meshes = renderer.scene.children.length;
    expect(meshes).toBe(4);
    stage.follow(6);
    expect([...stage.shown].sort((a: number, b: number) => a - b)).toEqual([5, 6, 7, 8]);
    expect(renderer.scene.children).toHaveLength(4);
    stage.follow(6);
    expect(renderer.scene.children).toHaveLength(4);
  });

  it('drops what it showed when another track is laid, and when it is destroyed', () => {
    stage.load(ring);
    stage.follow(0);
    expect(stage.shown.size).toBeGreaterThan(0);
    stage.load(rallyTrack(3));
    expect(stage.shown.size).toBe(0);
    expect(renderer.scene.children).toHaveLength(0);
    stage.follow(1);
    expect(stage.shown.size).toBe(3);
    scene.destroy();
    expect(stage.shown.size).toBe(0);
  });

  it('goes from the plane in units to the world in metres and back', () => {
    const point = new Vec2(3, -4);
    const world = stage.metres(point, 2);
    expect(world.x).toBeCloseTo(3 * UNIT_METERS, 9);
    expect(world.y).toBeCloseTo(2 * UNIT_METERS, 9);
    expect(world.z).toBeCloseTo(4 * UNIT_METERS, 9);
    const back = stage.plane(world);
    expect(back.x).toBeCloseTo(point.x, 9);
    expect(back.y).toBeCloseTo(point.y, 9);
  });
});
