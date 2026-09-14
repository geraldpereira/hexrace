import { TestBed } from '@angular/core/testing';
import { JoltPhysics, type Scene, Scenes } from '@hexrace/engine';
import { type Track, TrackExamples, TrackWindow } from '@hexrace/track';

import { rallyTrack } from '@game-commons/entity/track.mock';
import { TrackProbe } from '@game-commons/stage/track-probe';
import { TrackStage } from '@game-commons/stage/track-stage';

describe('TrackProbe', () => {
  let scene: Scene;
  let stage: TrackStage;
  let probe: TrackProbe;
  let window: TrackWindow;
  let ring: Track;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    await TestBed.inject(JoltPhysics).load();
    scene = TestBed.inject(Scenes).create();
    stage = scene.instantiate(TrackStage);
    scene.spawn('track').add(stage);
    probe = TestBed.inject(TrackProbe);
    window = TestBed.inject(TrackWindow);
    ring = TestBed.inject(TrackExamples).of('europe-ring-01')!;
  });

  afterEach(() => {
    scene.destroy();
  });

  function centre(track: Track, position: number, across = 0): { x: number; y: number; z: number } {
    const pose = window.playerPose(track, stage.placement, position)!;
    const right = pose.travel.right();
    return stage.metres(pose.point.add(right.scale(across)), pose.height);
  }

  it('answers nothing without a stage, and nothing while no track is laid', () => {
    expect(probe.at({ x: 0, y: 0, z: 0 })).toBeNull();
    probe.stage = stage;
    expect(probe.at({ x: 0, y: 0, z: 0 })).toBeNull();
  });

  it('reads the road under a point of the road, in the track environment', () => {
    stage.load(ring);
    probe.stage = stage;
    expect(probe.at(centre(ring, 2.5))).toEqual({ environment: 'europe', zone: 'road', rank: 1 });
  });

  it('walks out of the road on to the shoulder and then the landscape', () => {
    const track = rallyTrack(4);
    stage.load(track);
    probe.stage = stage;
    expect(probe.at(centre(track, 1.5, 0))?.zone).toBe('road');
    expect(probe.at(centre(track, 1.5, 1.5))?.zone).toBe('shoulder');
    expect(probe.at(centre(track, 1.5, 2.5))?.zone).toBe('landscape');
  });

  it('answers nothing over a point no tile owns', () => {
    stage.load(rallyTrack(2));
    probe.stage = stage;
    expect(probe.at({ x: 900, y: 0, z: 900 })).toBeNull();
  });
});
