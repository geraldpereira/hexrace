import { TestBed } from '@angular/core/testing';

import { GRAVITY, Probe } from '@engine/scene/game-component.mock';
import { type Scene } from '@engine/scene/scene';
import { Scenes } from '@engine/scene/scenes';

describe('Scene', () => {
  let scene: Scene;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    scene = TestBed.inject(Scenes).create([{ provide: GRAVITY, useValue: -9.81 }]);
  });

  afterEach(() => {
    scene.destroy();
  });

  it('instantiates components inside its own injector', () => {
    const probe = scene.instantiate(Probe);
    expect(probe.scene).toBe(scene);
    expect(probe.gravity).toBe(-9.81);
  });

  it('spawns objects under the root and drives them', () => {
    const go = scene.spawn('box', Probe);
    const probe = go.getOrThrow(Probe);
    expect(go.parent).toBe(scene.root);
    scene.start();
    scene.fixedUpdate();
    scene.render(0.25);
    expect(probe.started).toBe(true);
    expect(probe.fixed).toBe(1);
    expect(probe.rendered).toEqual([0.25]);
  });

  it('destroys the tree and the injector once', () => {
    const probe = scene.spawn('box', Probe).getOrThrow(Probe);
    scene.destroy();
    scene.destroy();
    expect(probe.destroyed).toBe(true);
    expect(scene.root.children).toEqual([]);
    expect(() => scene.injector.get(GRAVITY)).toThrow();
  });
});
