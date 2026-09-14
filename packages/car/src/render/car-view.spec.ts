import { TestBed } from '@angular/core/testing';
import { type GameObject, Scenes, ThreeRenderer } from '@hexrace/engine';

import { carSpec } from '@car/entity/car.mock';
import { CarView } from '@car/render/car-view';
import { type FakeReadout, fakeReadout } from '@car/render/readout.mock';

describe('CarView', () => {
  let readout: FakeReadout;
  let view: CarView;
  let object: GameObject;
  let renderer: ThreeRenderer;

  beforeEach(() => {
    renderer = TestBed.inject(ThreeRenderer);
    readout = fakeReadout();
    const scene = TestBed.inject(Scenes).create();
    view = scene.instantiate(CarView);
    view.readout = readout;
    view.spec = carSpec();
    object = scene.spawn('car');
    object.add(view);
    scene.start();
  });

  it('hangs the car in the scene, follows the pose and takes it away again', () => {
    expect(renderer.scene.children).toHaveLength(1);
    readout.pose.position.x = 3;
    readout.pose.wheels[1]!.position.z = 1.3;
    readout.pose = { ...readout.pose, wheels: readout.pose.wheels.slice(0, 3) };
    view.render?.();
    const group = renderer.scene.children[0]!;
    expect(group.position.x).toBe(3);
    expect(group.children[4]?.position.z).toBe(1.3);
    object.destroy();
    expect(renderer.scene.children).toHaveLength(0);
    view.render?.();
    view.onDestroy?.();
  });

  it('shows the centre of mass marker only when asked', () => {
    expect(view.showCentreOfMass).toBe(false);
    view.showCentreOfMass = true;
    expect(view.showCentreOfMass).toBe(true);
    object.destroy();
    view.showCentreOfMass = true;
    expect(view.showCentreOfMass).toBe(false);
  });
});
