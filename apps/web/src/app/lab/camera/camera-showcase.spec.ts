import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type * as THREE from 'three';

import { ThreeRenderer } from '@hexrace/engine';
import { INPUT_SOURCES, InputActions, type InputSource } from '@hexrace/inputs';

import { CameraShowcase } from '@ui/lab/camera/camera-showcase';

class ScriptedSource implements InputSource {
  readonly id = 'gamepad' as const;
  readonly actions = new InputActions();
  connected = true;
  poll(): void {
    // The test sets the actions by hand.
  }
}

describe('CameraShowcase', () => {
  let frames: FrameRequestCallback[];
  let rendered: THREE.PerspectiveCamera[];
  let source: ScriptedSource;
  let now: number;

  beforeEach(() => {
    frames = [];
    rendered = [];
    now = 1000;
    source = new ScriptedSource();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      frames.push(cb);
      return frames.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
    vi.spyOn(ThreeRenderer.prototype, 'render').mockImplementation((camera: THREE.Camera) => {
      rendered.push(camera as THREE.PerspectiveCamera);
    });
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private readonly cb: ResizeObserverCallback) {}
        observe(): void {
          queueMicrotask(() => {
            this.cb(
              [{ contentRect: { width: 400, height: 200 } } as ResizeObserverEntry],
              this as unknown as ResizeObserver,
            );
          });
        }
        disconnect(): void {
          // Nothing to disconnect.
        }
      },
    );
  });

  function panelRow(name: string): Element {
    const rows = [...document.querySelectorAll('.lil-controller')];
    return rows.find((r) => r.querySelector('.lil-name')?.textContent === name)!;
  }

  function tick(count: number): void {
    for (let i = 0; i < count; i++) {
      now += 20;
      const pending = frames.splice(0);
      for (const cb of pending) cb(now);
    }
  }

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
    tick(2);
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
    tick(30);
    expect(page.speedKmh()).toBeGreaterThan(0);
    const camera = rendered.at(-1)!;
    expect(camera.position.z).toBeGreaterThan(-20);
    source.actions.steer = 1;
    tick(30);
    expect(page.headingDeg()).toBeLessThan(0);
    source.actions.throttle = 0;
    source.actions.brake = 1;
    tick(60);
    expect(page.speedKmh()).toBe(0);

    panelRow('Next tile known').querySelector('input')!.click();
    tick(1);
    panelRow('Snap camera').querySelector('button')!.click();
    panelRow('Reset dummy').querySelector('button')!.click();
    tick(1);
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
