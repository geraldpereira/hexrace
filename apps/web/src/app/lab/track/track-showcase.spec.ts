import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { JoltPhysics, ThreeRenderer } from '@hexrace/engine';
import { TrackExamples, TrackFiles } from '@hexrace/track';
import type * as THREE from 'three';

import { TrackPanel } from '@ui/lab/track/track-panel';
import { TrackShowcase } from '@ui/lab/track/track-showcase';
import { type FakeContext, fakeContext, mockCanvasContext } from '@ui/testing/canvas.mock';
import { type FrameCapture, captureFrames } from '@ui/testing/frames.mock';
import { panelButton, panelInput, panelRow, panelSelect } from '@ui/testing/panel.mock';
import { stubResizeObserver } from '@ui/testing/resize-observer.mock';

interface Page {
  host: HTMLElement;
  page: TrackShowcase;
  destroy(): void;
}

describe('TrackShowcase', () => {
  let capture: FrameCapture;
  let fake: FakeContext;
  let rendered: THREE.Camera[];

  beforeEach(() => {
    capture = captureFrames({ clock: true });
    fake = fakeContext();
    rendered = [];
    vi.spyOn(ThreeRenderer.prototype, 'render').mockImplementation((camera: THREE.Camera) => {
      rendered.push(camera);
    });
    stubResizeObserver({ width: 400, height: 300 });
  });

  async function render(): Promise<Page> {
    await TestBed.configureTestingModule({
      imports: [TrackShowcase],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(TrackShowcase);
    await fixture.whenStable();
    return {
      host: fixture.nativeElement as HTMLElement,
      page: fixture.componentInstance,
      destroy: () => {
        fixture.destroy();
      },
    };
  }

  async function loaded(): Promise<Page> {
    mockCanvasContext(fake);
    const page = await render();
    await TestBed.inject(JoltPhysics).load();
    await new Promise((resolve) => setTimeout(resolve, 0));
    TestBed.tick();
    return page;
  }

  function bodies(): number {
    return TestBed.inject(JoltPhysics).physicsSystem.GetNumBodies();
  }

  it('waits for the physics, and leaves nothing behind when the page is left', async () => {
    const { host, page, destroy } = await render();
    expect(host.textContent).toContain('Loading the physics');
    page.rebuild();
    page.dropOnPlayer();
    expect(TestBed.inject(JoltPhysics).ready).toBe(false);
    destroy();
    await TestBed.inject(JoltPhysics).load();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(bodies()).toBe(0);
  });

  it('lays the small ring, keeps only the window alive and draws the map', async () => {
    const { host, page } = await loaded();
    expect(host.textContent).toContain('Loop · 12 tiles · the model accepts it');
    expect(bodies()).toBe(7);
    expect(page.issues()).toEqual([]);
    expect(page.text()).toContain('hexrace-track 1');
    expect(fake.calls.length).toBeGreaterThan(0);
    expect([TestBed.inject(ThreeRenderer).width, TestBed.inject(ThreeRenderer).height]).toEqual([
      400, 300,
    ]);
    capture.tick(2);
    expect(rendered).toHaveLength(2);
  });

  it('moves the player, which loads and unloads tiles', async () => {
    const { page } = await loaded();
    panelInput('Player position', '6');
    expect(page.draft.position).toBe(6);
    expect(bodies()).toBe(7);
    panelInput('Tiles ahead', '1');
    panelInput('Tiles behind', '1');
    expect(bodies()).toBe(3);
    panelRow('Camera follows').querySelector('input')!.click();
    panelRow('2D map').querySelector('input')!.click();
    panelInput('Player position', '0.5');
    expect(bodies()).toBe(3);
  });

  it('rebuilds on a view change and outlines what the validation refuses', async () => {
    const { host, page } = await loaded();
    panelSelect('Example', 'europe-overlap-01');
    TestBed.tick();
    expect(page.issues()).toEqual(['tile 6: covers tile 0 at (0,0)']);
    expect(host.textContent).toContain('see what it refuses below');
    expect(host.querySelector('.issues')?.textContent).toContain('covers tile 0');
    panelRow('Smooth shading').querySelector('input')!.click();
    panelRow('Tile outline').querySelector('input')!.click();
    expect(bodies()).toBeGreaterThan(0);
  });

  it('reads the text area, and says what it cannot read', async () => {
    const { host, page } = await loaded();
    const line = TestBed.inject(TrackFiles).serialize(
      TestBed.inject(TrackExamples).of('europe-line-01')!,
    );
    page.onText(line);
    page.loadText();
    TestBed.tick();
    expect(page.text()).toBe(line);
    expect(host.textContent).toContain('Straight Line · 4 tiles');
    page.onText('hexrace-track 1\n[tiles]\n');
    page.loadText();
    TestBed.tick();
    expect(page.issues()).toContain('header: "id" is missing');
    expect(host.textContent).toContain('The file does not read.');
    page.moveTo(2);
    expect(bodies()).toBe(0);
  });

  it('shows a track with no tile at all without falling over', async () => {
    const { host, page } = await loaded();
    page.onText('hexrace-track 1\nid: x\nname: X\nenvironment: europe\nmode: rally\n[tiles]\n');
    page.loadText();
    TestBed.tick();
    expect(host.textContent).toContain('X · 0 tiles');
    expect(bodies()).toBe(0);
    page.dropOnPlayer();
    expect(bodies()).toBe(0);
  });

  it('generates a track from the seed and the dials', async () => {
    const { host } = await loaded();
    panelInput('Seed', 'lab');
    panelInput('Turning', '9');
    panelInput('Tiles', '8');
    panelSelect('Environment', 'africa');
    panelButton('Generate').click();
    TestBed.tick();
    expect(host.textContent).toContain('Seed lab · 8 tiles · the model accepts it');
  });

  it('drops crates on the window and clears them', async () => {
    const { destroy } = await loaded();
    panelButton('Drop a crate').click();
    panelButton('Drop a crate').click();
    expect(bodies()).toBe(9);
    capture.tick(3);
    panelButton('Clear crates').click();
    expect(bodies()).toBe(7);
    destroy();
    expect(bodies()).toBe(0);
    expect(TestBed.inject(ThreeRenderer).scene.children).toEqual([]);
  });

  it('leaves the player slider alone until a track is loaded', () => {
    TestBed.configureTestingModule({});
    expect(() => {
      TestBed.inject(TrackPanel).onTrackLoaded(5);
    }).not.toThrow();
  });
});
