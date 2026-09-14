import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import type * as THREE from 'three';

import { Clock, EventBus } from '@hexrace/commons';
import { JoltPhysics, ThreeRenderer } from '@hexrace/engine';
import { BestTimes } from '@hexrace/game-commons';
import { ResultsDialogs } from '@hexrace/hud';
import { INPUT_SOURCES } from '@hexrace/inputs';

import { RaceShowcase } from '@ui/lab/race/race-showcase';
import { FakeClock } from '@ui/testing/clock.mock';
import { type FrameCapture, captureFrames } from '@ui/testing/frames.mock';
import { panelButton, panelSelect } from '@ui/testing/panel.mock';
import { stubResizeObserver } from '@ui/testing/resize-observer.mock';
import { ScriptedSource } from '@ui/testing/scripted-source.mock';

const EMPTY_TRACK = `hexrace-track 1

id: europe-empty-01
name: Empty
environment: europe
mode: rally

[tiles]
`;

interface Page {
  host: HTMLElement;
  page: RaceShowcase;
  destroy(): void;
}

function sweep(row: Element): void {
  const control = row.querySelector('input, select, button');
  if (!(control instanceof HTMLElement) || control.hasAttribute('disabled')) return;
  if (control instanceof HTMLSelectElement) {
    control.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }
  if (control instanceof HTMLButtonElement) {
    control.click();
    return;
  }
  if (!(control instanceof HTMLInputElement)) return;
  if (control.type === 'checkbox') {
    control.click();
    control.click();
    return;
  }
  control.value = String(Number(control.value) + 1);
  control.dispatchEvent(new Event('input', { bubbles: true }));
  control.dispatchEvent(new FocusEvent('blur'));
}

describe('RaceShowcase', () => {
  let capture: FrameCapture;
  let clock: FakeClock;
  let rendered: THREE.Camera[];
  let source: ScriptedSource;

  beforeEach(() => {
    localStorage.clear();
    capture = captureFrames({ clock: true });
    clock = new FakeClock();
    rendered = [];
    source = new ScriptedSource();
    vi.spyOn(ThreeRenderer.prototype, 'render').mockImplementation((camera: THREE.Camera) => {
      rendered.push(camera);
    });
    stubResizeObserver({ width: 400, height: 300 });
  });

  async function render(): Promise<Page> {
    await TestBed.configureTestingModule({
      imports: [RaceShowcase],
      providers: [
        provideRouter([]),
        { provide: Clock, useValue: clock },
        { provide: INPUT_SOURCES, useValue: source, multi: true },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(RaceShowcase);
    await fixture.whenStable();
    return {
      host: fixture.nativeElement as HTMLElement,
      page: fixture.componentInstance,
      destroy: () => fixture.destroy(),
    };
  }

  async function loaded(): Promise<Page> {
    const page = await render();
    await TestBed.inject(JoltPhysics).load();
    await new Promise((r) => setTimeout(r, 0));
    TestBed.tick();
    return page;
  }

  function go(): void {
    clock.tick(3);
    capture.tick(2, 50);
  }

  it('waits for the physics, and builds nothing once the page is left', async () => {
    const { host, destroy } = await render();
    expect(host.textContent).toContain('Loading the physics');
    expect(host.textContent).toContain('Hold R or Y for three seconds');
    destroy();
    await TestBed.inject(JoltPhysics).load();
    await new Promise((r) => setTimeout(r, 0));
    expect(TestBed.inject(JoltPhysics).physicsSystem.GetNumBodies()).toBe(0);
  });

  it('lays the example track, holds the car on the line, then lets it drive away', async () => {
    const { host, page, destroy } = await loaded();
    expect(host.textContent).toContain('Small Ring');
    expect(host.textContent).toContain('the model accepts it');
    expect(page.settings).toEqual({ mode: 'track', laps: 3 });
    expect(page.stage.shown.size).toBeGreaterThan(1);
    expect(page.best).toBe('--');

    source.actions.throttle = 1;
    capture.tick(30, 50);
    expect(page.director.state.phase).toBe('countdown');
    expect(page.countdownStep()).toBe(3);
    expect(page.car.frozen).toBe(true);
    expect(page.dash.kmh()).toBeLessThan(2);
    expect(rendered.length).toBeGreaterThan(0);

    go();
    expect(page.director.state.phase).toBe('racing');
    expect(page.car.frozen).toBe(false);
    const from = page.director.state.position;
    capture.tick(150, 50);
    clock.tick(5);
    capture.tick(2, 50);
    expect(page.dash.kmh()).toBeGreaterThan(10);
    expect(page.dash.rpm()).toBeGreaterThan(800);
    expect(page.director.state.position).toBeGreaterThan(from);
    expect(page.car.nextTile).not.toBeNull();
    expect(page.timer().currentMs).toBeCloseTo(5000, -2);
    expect(page.timer().lapCount).toBe(3);
    expect(page.tile).toBe(Math.floor(page.director.state.position));

    page.options.abs.enabled = true;
    page.options.tractionControl.enabled = true;
    capture.tick(2, 50);
    expect(page.dash.assists().abs).not.toBeNull();
    expect(page.dash.assists().tractionControl).not.toBeNull();
    destroy();
  });

  it('shows a track the model refuses, refuses a text that does not read, and says when a track lays nothing', async () => {
    const { host, page, destroy } = await loaded();
    panelSelect('Example', 'europe-overlap-01');
    TestBed.tick();
    expect(page.issues().length).toBeGreaterThan(0);
    expect(host.textContent).toContain('see what it refuses');
    expect(page.stage.shown.size).toBeGreaterThan(0);

    page.loadText('not a track file at all');
    expect(page.issues().length).toBeGreaterThan(0);
    expect(page.status()).toBe('The file does not read.');

    page.loadText(EMPTY_TRACK);
    expect(page.status()).toContain('lays no tile');
    expect(page.stage.shown.size).toBe(0);
    capture.tick(4, 50);
    expect(page.director.state.phase).toBe('countdown');
    expect(page.car.nextTile).toBeNull();
    destroy();
  });

  it('opens the results box when the race ends', async () => {
    const { page, destroy } = await loaded();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    go();
    expect(page.director.state.phase).toBe('racing');
    TestBed.inject(EventBus).publish('race/finish', { timeMs: 61_234, record: true });
    await new Promise((r) => setTimeout(r, 0));
    const box = document.querySelector('hr-results-dialog')!;
    expect(box.textContent).toContain('1:01.23');
    expect(box.textContent).toContain('new record');
    box.querySelectorAll('button')[0]!.click();
    destroy();
  });

  it('starts over on Retry, goes back to the lab on Home, and reads the saved best again', async () => {
    const { page, destroy } = await loaded();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const open = vi.spyOn(TestBed.inject(ResultsDialogs), 'open').mockResolvedValue('retry');
    TestBed.inject(BestTimes).record('europe-ring-01', 61_234);
    go();

    TestBed.inject(EventBus).publish('race/finish', { timeMs: 61_234, record: true });
    await new Promise((r) => setTimeout(r, 0));
    expect(open).toHaveBeenCalledWith({ mode: 'track', timeMs: 61_234, record: true });
    expect(page.best).toBe('61.23 s');
    expect(page.director.state.phase).toBe('countdown');

    open.mockResolvedValue('home');
    TestBed.inject(EventBus).publish('race/finish', { timeMs: 61_234, record: false });
    await new Promise((r) => setTimeout(r, 0));
    expect(navigate).toHaveBeenCalledWith(['/lab']);
    destroy();
  });

  it('shows the best time the package saved, and forgets it on demand', async () => {
    const { page, destroy } = await loaded();
    TestBed.inject(BestTimes).record('europe-ring-01', 12_340);
    page.rebuild();
    expect(page.best).toBe('12.34 s');
    panelButton('Clear best time').click();
    expect(page.best).toBe('--');
    destroy();
  });

  it('answers every knob of the panel, from the generator to the fall margin', async () => {
    const { page, destroy } = await loaded();
    const folder = [...document.querySelectorAll('.lil-gui')].find(
      (gui) => gui.querySelector(':scope > .lil-title')?.textContent === 'Race',
    )!;
    for (const row of [...folder.querySelectorAll('.lil-controller')]) {
      const name = row.querySelector('.lil-name')?.textContent ?? '';
      if (name === 'Reset folder' || name === 'Reset all') continue;
      sweep(row);
    }
    capture.tick(4, 50);
    expect(page.draft.source).toBe('generated');
    expect(page.director.state.phase).toBe('countdown');
    destroy();
  });
});
