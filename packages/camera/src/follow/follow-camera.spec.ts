import { TestBed } from '@angular/core/testing';
import { CameraComponent, Scenes } from '@hexrace/engine';
import * as THREE from 'three';

import { DummyTarget } from '@camera/entity/camera-target.mock';
import { CameraTuning } from '@camera/follow/camera-tuning';
import { FollowCamera } from '@camera/follow/follow-camera';

describe('FollowCamera', () => {
  let dummy: DummyTarget;
  let follow: FollowCamera;
  let camera: THREE.PerspectiveCamera;
  let tuning: CameraTuning;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    tuning = TestBed.inject(CameraTuning);
    tuning.distance = 10;
    tuning.heightAtRest = 5;
    tuning.lookAhead = 5;
    tuning.smoothing = 5;
    dummy = new DummyTarget();
    const scene = TestBed.inject(Scenes).create();
    const go = scene.spawn('camera', CameraComponent);
    follow = scene.instantiate(FollowCamera);
    follow.target = dummy;
    go.add(follow);
    scene.start();
    camera = go.getOrThrow(CameraComponent).camera;
  });

  function forward(): THREE.Vector3 {
    return camera.getWorldDirection(new THREE.Vector3());
  }

  it('jumps to the pose on the first frame and looks ahead of the target', () => {
    follow.render(0.016);
    expect(camera.position.toArray()).toEqual([0, 5, -10]);
    const dir = forward();
    expect(dir.z).toBeGreaterThan(0.9);
    expect(dir.y).toBeLessThan(0);
  });

  it('eases towards a moved target and snaps on demand', () => {
    follow.render(0.016);
    dummy.position.set(100, 0, 0);
    follow.render(0.1);
    const eased = camera.position.x;
    expect(eased).toBeGreaterThan(0);
    expect(eased).toBeLessThan(100);
    follow.render(10);
    expect(camera.position.x).toBeCloseTo(100, 3);
    dummy.position.set(0, 0, 50);
    follow.snap();
    expect(camera.position.toArray()).toEqual([0, 5, 40]);
  });
});
