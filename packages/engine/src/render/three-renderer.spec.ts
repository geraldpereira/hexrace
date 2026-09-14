import { TestBed } from '@angular/core/testing';
import * as THREE from 'three';

import { ThreeRenderer } from '@engine/render/three-renderer';
import { webGlCalls as calls } from '@engine/render/web-gl-renderer.mock';

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof THREE>();
  const { FakeWebGLRenderer } = await import('@engine/render/web-gl-renderer.mock');
  return { ...actual, WebGLRenderer: FakeWebGLRenderer };
});

describe('ThreeRenderer', () => {
  let renderer: ThreeRenderer;

  beforeEach(() => {
    calls.length = 0;
    Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 3 });
    TestBed.configureTestingModule({});
    renderer = TestBed.inject(ThreeRenderer);
  });

  it('owns the canvas and a scene with fog', () => {
    expect(renderer.canvas).toBeInstanceOf(HTMLCanvasElement);
    expect(renderer.scene.fog).toBeInstanceOf(THREE.Fog);
  });

  it('creates the WebGL renderer on the first render, at the last size, ratio capped at 2', () => {
    renderer.resize(0, 0);
    expect([renderer.width, renderer.height]).toEqual([1, 1]);
    renderer.resize(640, 360);
    expect([renderer.width, renderer.height]).toEqual([640, 360]);
    expect(calls).toEqual([]);
    const camera = new THREE.PerspectiveCamera();
    renderer.render(camera);
    renderer.render(camera);
    expect(calls).toEqual(['create', 'ratio 2', 'size 640x360 false', 'render', 'render']);
    renderer.resize(320, 180);
    expect(calls.at(-1)).toBe('size 320x180 false');
  });

  it('disposes and recreates on demand', () => {
    renderer.dispose();
    renderer.render(new THREE.PerspectiveCamera());
    renderer.dispose();
    expect(calls).toEqual(['create', 'ratio 2', 'size 1x1 false', 'render', 'dispose']);
  });
});
