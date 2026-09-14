import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type * as THREE from 'three';

import { ThreeRenderer } from '@hexrace/engine';
import { INPUT_SOURCES } from '@hexrace/inputs';

import { CameraShowcase } from '@ui/lab/camera/camera-showcase';
import { type FrameCapture, captureFrames } from '@ui/testing/frames.mock';
import { panelRow } from '@ui/testing/panel.mock';
import { stubResizeObserver } from '@ui/testing/resize-observer.mock';
import { ScriptedSource } from '@ui/testing/scripted-source.mock';

describe('CameraShowcase', () => {
  let capture: FrameCapture;
  let rendered: THREE.PerspectiveCamera[];
  let source: ScriptedSource;

  beforeEach(() => {
    capture = captureFrames({ clock: true });
    rendered = [];
    source = new ScriptedSource();
    vi.spyOn(ThreeRenderer.prototype, 'render').mockImplementation((camera: THREE.Camera) => {
      rendered.push(camera as THREE.PerspectiveCamera);
    });
    stubResizeObserver({ width: 400, height: 200 });
  });

  async function render(): Promise<{ host: HTMLElement; page: CameraShowcase; destroy(): void }> {
    await TestBed.configureTestingModule({
      imports: [CameraShowcase],
      providers: [provideRouter([]), { provide: INPUT_SOURCES, useValue: source, multi: true }],
    }).compileComponents();
    const fixture = TestBed.createComponent(CameraShowcase);
    await fixture.whenStable();
    return {
      host: fixture.nativeElement as HTMLElement,
      page: fixture.componentInstance,
      destroy: () => fixture.destroy(),
    };
  }

  it('builds the scene, follows the frame size, and stands still without inputs', async () => {
    const { host, page } = await render();
    const renderer = TestBed.inject(ThreeRenderer);
    expect(renderer.scene.children).toHaveLength(5);
    expect([renderer.width, renderer.height]).toEqual([400, 200]);
    capture.tick(2);
    expect(rendered).toHaveLength(2);
    expect(rendered[0]!.aspect).toBe(2);
    expect(page.speedKmh()).toBe(0);
    expect(host.textContent).toContain('0 km/h');
    expect(page.showPaddles()).toBe(false);
    expect(host.querySelector('hr-touch-paddles')).toBeNull();
  });

  it('drives the dummy with the inputs, the camera following, and resets from the panel', async () => {
    const { page } = await render();
    source.actions.throttle = 1;
    capture.tick(30);
    expect(page.speedKmh()).toBeGreaterThan(0);
    const camera = rendered.at(-1)!;
    expect(camera.position.z).toBeGreaterThan(-20);
    source.actions.steer = 1;
    capture.tick(30);
    expect(page.headingDeg()).toBeLessThan(0);
    source.actions.throttle = 0;
    source.actions.brake = 1;
    capture.tick(60);
    expect(page.speedKmh()).toBe(0);

    panelRow('Next tile known').querySelector('input')!.click();
    capture.tick(1);
    panelRow('Snap camera').querySelector('button')!.click();
    panelRow('Reset dummy').querySelector('button')!.click();
    capture.tick(1);
    expect(page.headingDeg()).toBe(0);
    expect(rendered.at(-1)!.position.toArray()).toEqual([0, 5, -9]);
  });

  it('shows the paddles on a coarse pointer', async () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({ matches: true }),
    });
    const { host, page } = await render();
    expect(page.showPaddles()).toBe(true);
    expect(host.querySelector('hr-touch-paddles')).not.toBeNull();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({ matches: false }),
    });
  });

  it('stops the loop and empties the scene when left', async () => {
    const { destroy } = await render();
    destroy();
    expect(TestBed.inject(ThreeRenderer).scene.children).toEqual([]);
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });
});
