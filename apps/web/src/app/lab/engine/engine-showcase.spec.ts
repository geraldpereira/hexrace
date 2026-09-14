import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type * as THREE from 'three';

import { JoltPhysics, ThreeRenderer } from '@hexrace/engine';
import { PerfMeter } from '@hexrace/hud';

import { EngineShowcase } from '@ui/lab/engine/engine-showcase';
import { type FrameCapture, captureFrames } from '@ui/testing/frames.mock';
import { panelButton } from '@ui/testing/panel.mock';
import { type ResizeControl, stubResizeObserver } from '@ui/testing/resize-observer.mock';

describe('EngineShowcase', () => {
  let capture: FrameCapture;
  let observer: ResizeControl;
  let rendered: THREE.Camera[];

  beforeEach(() => {
    capture = captureFrames();
    observer = stubResizeObserver();
    rendered = [];
    vi.spyOn(ThreeRenderer.prototype, 'render').mockImplementation((camera: THREE.Camera) => {
      rendered.push(camera);
    });
  });

  async function render(): Promise<{ host: HTMLElement; destroy(): void }> {
    await TestBed.configureTestingModule({
      imports: [EngineShowcase],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(EngineShowcase);
    await fixture.whenStable();
    return { host: fixture.nativeElement as HTMLElement, destroy: () => fixture.destroy() };
  }

  it('ignores a drop and a resize before the physics is ready, and a load after leaving', async () => {
    const { host, destroy } = await render();
    const renderer = TestBed.inject(ThreeRenderer);
    expect(host.textContent).toContain('Loading the physics');
    panelButton('Drop a crate').click();
    observer.resize(300, 150);
    expect([renderer.width, renderer.height]).toEqual([300, 150]);
    expect(renderer.scene.children).toEqual([]);
    destroy();
    await TestBed.inject(JoltPhysics).load();
    await new Promise((r) => setTimeout(r, 0));
    expect(renderer.scene.children).toEqual([]);
  });

  it('builds the scene once loaded, runs the loop, drops and clears crates, and cleans up', async () => {
    const { host, destroy } = await render();
    const renderer = TestBed.inject(ThreeRenderer);
    observer.resize(300, 600);
    const physics = TestBed.inject(JoltPhysics);
    await physics.load();
    await new Promise((r) => setTimeout(r, 0));
    TestBed.tick();
    expect(host.textContent).toContain('Physics ready in');
    expect(physics.physicsSystem.GetNumBodies()).toBe(2);
    expect(renderer.scene.children).toHaveLength(5);

    capture.tick(1);
    const camera = rendered[0] as THREE.PerspectiveCamera;
    expect(camera.aspect).toBe(0.5);
    observer.resize(400, 200);
    expect(camera.aspect).toBe(2);
    capture.tick(2);
    expect(rendered).toHaveLength(3);
    expect(TestBed.inject(PerfMeter).fps).toBeGreaterThan(0);

    panelButton('Drop a crate').click();
    panelButton('Drop a crate').click();
    capture.tick(1);
    expect(physics.physicsSystem.GetNumBodies()).toBe(4);
    expect(document.querySelector('.lil-gui')?.textContent).toContain('Bodies');

    panelButton('Clear crates').click();
    expect(physics.physicsSystem.GetNumBodies()).toBe(1);

    destroy();
    expect(physics.physicsSystem.GetNumBodies()).toBe(0);
    expect(renderer.scene.children).toEqual([]);
  });
});
