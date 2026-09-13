import { InjectionToken, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Component } from '@engine/scene/game-object';
import { Scene, Scenes } from '@engine/scene/scene';

const GRAVITY = new InjectionToken<number>('GRAVITY');

class Probe extends Component {
  readonly scene = inject(Scene);
  readonly gravity = inject(GRAVITY);
  fixed = 0;
  rendered: number[] = [];
  destroyed = false;
  override fixedUpdate(): void {
    this.fixed += 1;
  }
  override render(dt: number): void {
    this.rendered.push(dt);
  }
  override onDestroy(): void {
    this.destroyed = true;
  }
}

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
