import { TestBed } from '@angular/core/testing';
import { JoltPhysics, type Scene, Scenes, ThreeRenderer } from '@hexrace/engine';
import { Vec2 } from '@hexrace/commons';
import { UNIT_METERS } from '@hexrace/tile';
import { type Track, TrackExamples } from '@hexrace/track';
import type * as THREE from 'three';

import { rallyTrack } from '@game-commons/entity/track.mock';
import { FADE_SECONDS } from '@game-commons/stage/tile-fader';
import { TrackStage } from '@game-commons/stage/track-stage';

const HALF_FADE = FADE_SECONDS / 2;

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

  function opacities(): number[] {
    return renderer.scene.children.map((group: THREE.Object3D) => {
      let opacity = 0;
      group.traverse((child: THREE.Object3D) => {
        const material = (child as Partial<{ material: THREE.Material }>).material;
        if (material) opacity = material.opacity;
      });
      return opacity;
    });
  }

  function settle(): void {
    stage.render(FADE_SECONDS);
  }

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
    settle();
    expect([...stage.shown].sort((a: number, b: number) => a - b)).toEqual([4, 5, 6, 7]);
    expect(renderer.scene.children).toHaveLength(4);
    stage.follow(6);
    expect([...stage.shown].sort((a: number, b: number) => a - b)).toEqual([5, 6, 7, 8]);
    settle();
    expect(renderer.scene.children).toHaveLength(4);
    stage.follow(6);
    settle();
    expect(renderer.scene.children).toHaveLength(4);
  });

  it('brings a tile up from nothing and takes the one that leaves down before dropping it', () => {
    stage.load(ring);
    stage.ahead = 1;
    stage.behind = 0;
    stage.follow(0);
    expect(opacities()).toEqual([0, 0]);
    stage.render(HALF_FADE);
    expect(opacities()).toEqual([0.5, 0.5]);
    stage.render(HALF_FADE);
    expect(opacities()).toEqual([1, 1]);
    stage.follow(1);
    stage.render(HALF_FADE);
    expect(opacities()).toEqual([0.5, 1, 0.5]);
    expect([...stage.shown].sort((a: number, b: number) => a - b)).toEqual([1, 2]);
    stage.render(HALF_FADE);
    expect(renderer.scene.children).toHaveLength(2);
    expect(opacities()).toEqual([1, 1]);
  });

  it('turns a tile round where it stands when the window takes it back', () => {
    stage.load(ring);
    stage.ahead = 1;
    stage.behind = 0;
    stage.follow(0);
    stage.render(FADE_SECONDS);
    stage.follow(1);
    stage.render(HALF_FADE);
    expect(opacities()[0]).toBe(0.5);
    stage.follow(0);
    stage.render(HALF_FADE);
    expect(opacities()[0]).toBe(1);
    expect([...stage.shown].sort((a: number, b: number) => a - b)).toEqual([0, 1]);
  });

  it('drops what it showed when another track is laid, and when it is destroyed', () => {
    stage.load(ring);
    stage.follow(0);
    settle();
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
