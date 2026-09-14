import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type * as THREE from 'three';

import { JoltPhysics, ThreeRenderer } from '@hexrace/engine';

import { TileShowcase } from '@ui/lab/tile/tile-showcase';

describe('TileShowcase', () => {
  let frames: FrameRequestCallback[];
  let rendered: THREE.Camera[];
  let clock: number;

  beforeEach(() => {
    frames = [];
    rendered = [];
    clock = performance.now();
    vi.spyOn(performance, 'now').mockImplementation(() => clock);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      frames.push(cb);
      return frames.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
    vi.spyOn(ThreeRenderer.prototype, 'render').mockImplementation((camera: THREE.Camera) => {
      rendered.push(camera);
    });
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private readonly cb: ResizeObserverCallback) {}
        observe(): void {
          queueMicrotask(() => {
            this.cb(
              [{ contentRect: { width: 400, height: 300 } } as ResizeObserverEntry],
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
      clock += 20;
      const pending = frames.splice(0);
      for (const cb of pending) cb(clock);
    }
  }

  async function render(): Promise<{ host: HTMLElement; page: TileShowcase; destroy(): void }> {
    await TestBed.configureTestingModule({
      imports: [TileShowcase],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(TileShowcase);
    await fixture.whenStable();
    return {
      host: fixture.nativeElement as HTMLElement,
      page: fixture.componentInstance,
      destroy: () => fixture.destroy(),
    };
  }

  async function loaded(): Promise<{ host: HTMLElement; page: TileShowcase; destroy(): void }> {
    const page = await render();
    await TestBed.inject(JoltPhysics).load();
    await new Promise((r) => setTimeout(r, 0));
    TestBed.tick();
    return page;
  }

  it('waits for the physics before building, and does nothing after leaving', async () => {
    const { host, page, destroy } = await render();
    expect(host.textContent).toContain('Loading the physics');
    page.canvas.dispatchEvent(new MouseEvent('pointermove', { clientX: 10, clientY: 10 }));
    expect(page.probe.zone).toBe('-');
    page.rebuild();
    panelRow('Drop a crate').querySelector('button')!.click();
    expect(TestBed.inject(JoltPhysics).ready).toBe(false);
    destroy();
    await TestBed.inject(JoltPhysics).load();
    await new Promise((r) => setTimeout(r, 0));
    expect(TestBed.inject(JoltPhysics).physicsSystem.GetNumBodies()).toBe(0);
  });

  it('builds the tile with its collider, rebuilds on a panel change, and reports model errors', async () => {
    const { host, page } = await loaded();
    const physics = TestBed.inject(JoltPhysics);
    const renderer = TestBed.inject(ThreeRenderer);
    expect(host.textContent).toContain('accepts the tile');
    expect(physics.physicsSystem.GetNumBodies()).toBe(1);
    expect(renderer.scene.children).toHaveLength(4);
    expect([renderer.width, renderer.height]).toEqual([400, 300]);
    tick(2);
    expect(rendered).toHaveLength(2);

    panelRow('Smooth shading').querySelector('input')!.click();
    expect(physics.physicsSystem.GetNumBodies()).toBe(1);
    page.draft.outline = false;
    page.draft.line = false;
    page.draft.entry.position = 7;
    page.rebuild();
    TestBed.tick();
    expect(page.errors()).toContain(
      'entry profile: no landscape on the right: the block ends at unit 11',
    );
    expect(page.errors()).toContain('right barrier: spills out of the tile');
    expect(host.querySelector('p.error')).not.toBeNull();
  });

  it('reads the surface under the pointer', async () => {
    const { page } = await loaded();
    vi.spyOn(page.canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 400,
      height: 300,
    } as DOMRect);
    const hover = (x: number, y: number): void => {
      page.canvas.dispatchEvent(new MouseEvent('pointermove', { clientX: x, clientY: y }));
    };
    tick(1);
    hover(200, 160);
    expect(['road', 'shoulder', 'landscape']).toContain(page.probe.zone);
    expect(page.probe.type).toBeGreaterThan(0);
    const onGround = page.probe.zone;
    hover(200, 0);
    expect(page.probe.zone).toBe(onGround);
  });

  it('drops crates on the collider and clears them, and frees everything when left', async () => {
    const { destroy } = await loaded();
    const physics = TestBed.inject(JoltPhysics);
    panelRow('Drop a crate').querySelector('button')!.click();
    panelRow('Drop a crate').querySelector('button')!.click();
    expect(physics.physicsSystem.GetNumBodies()).toBe(3);
    tick(3);
    panelRow('Clear crates').querySelector('button')!.click();
    expect(physics.physicsSystem.GetNumBodies()).toBe(1);
    destroy();
    expect(physics.physicsSystem.GetNumBodies()).toBe(0);
    expect(TestBed.inject(ThreeRenderer).scene.children).toEqual([]);
  });
});
