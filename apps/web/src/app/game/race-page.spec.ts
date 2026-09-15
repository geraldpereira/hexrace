import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import type * as THREE from 'three';

import { Clock, EventBus } from '@hexrace/commons';
import { JoltPhysics, ThreeRenderer } from '@hexrace/engine';
import { BEST_TIMES_KEY } from '@hexrace/game-commons';
import { PerfMeter, ResultsDialogs } from '@hexrace/hud';
import { INPUT_SOURCES } from '@hexrace/inputs';

import { RacePage } from '@ui/game/race-page';
import { FakeClock } from '@ui/testing/clock.mock';
import { type FrameCapture, captureFrames } from '@ui/testing/frames.mock';
import { stubResizeObserver } from '@ui/testing/resize-observer.mock';
import { ScriptedSource } from '@ui/testing/scripted-source.mock';

const TRACK_ID = 'europe-ring-01';

interface Page {
  host: HTMLElement;
  page: RacePage;
  destroy(): void;
}

describe('RacePage', () => {
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

  async function render(id: string | null = TRACK_ID): Promise<Page> {
    await TestBed.configureTestingModule({
      imports: [RacePage],
      providers: [
        provideRouter([]),
        { provide: Clock, useValue: clock },
        { provide: INPUT_SOURCES, useValue: source, multi: true },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: new Map<string, string>(id === null ? [] : [['track', id]]) },
          },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(RacePage);
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

  it('leaves for the front page when the address names no playable track', async () => {
    const navigate = vi.spyOn(Router.prototype, 'navigate').mockResolvedValue(true);
    const nameless = await render(null);
    expect(navigate).toHaveBeenCalledWith(['/']);
    nameless.destroy();
    TestBed.resetTestingModule();
    const { destroy } = await render('nowhere-at-all');
    expect(navigate).toHaveBeenCalledWith(['/']);
    await TestBed.inject(JoltPhysics).load();
    await new Promise((r) => setTimeout(r, 0));
    expect(TestBed.inject(JoltPhysics).physicsSystem.GetNumBodies()).toBe(0);
    destroy();
  });

  it('lays the track, holds the car on the line, then runs the chrono and the HUD', async () => {
    const { host, page, destroy } = await loaded();
    expect(page.race.stage.shown.size).toBeGreaterThan(1);
    expect(TestBed.inject(PerfMeter).cornerVisible()).toBe(false);
    expect(host.querySelector('.lil-gui')).toBeNull();

    source.actions.throttle = 1;
    capture.tick(30, 50);
    expect(page.race.director.state.phase).toBe('countdown');
    expect(page.readout.countdownStep()).toBe(3);
    expect(page.readout.timer().lapCount).toBe(3);
    expect(page.race.parts.car.frozen).toBe(true);

    go();
    expect(page.race.director.state.phase).toBe('racing');
    capture.tick(150, 50);
    clock.tick(5);
    capture.tick(2, 50);
    expect(page.dash.kmh()).toBeGreaterThan(10);
    expect(page.readout.timer().currentMs).toBeCloseTo(5000, -2);
    expect(page.readout.wrongWay()).toBe(false);
    expect(rendered.length).toBeGreaterThan(0);
    destroy();
  });

  it('asks before quitting, runs on behind the question, and resumes or leaves', async () => {
    const { host, page, destroy } = await loaded();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    go();
    capture.tick(2, 50);
    expect(host.querySelector('.quit')).toBeNull();

    source.actions.back = 1;
    capture.tick(2, 50);
    TestBed.tick();
    expect(host.querySelector('.quit')).not.toBeNull();
    expect(page.race.director.state.phase).toBe('racing');
    capture.tick(2, 50);
    expect(host.querySelector('.quit')).not.toBeNull();

    page.quitChose('resume');
    TestBed.tick();
    expect(host.querySelector('.quit')).toBeNull();
    page.quitChose('quit');
    expect(navigate).toHaveBeenCalledWith(['/']);
    destroy();
  });

  it('opens the results box at the flag: Retry runs it again, Home leaves the game', async () => {
    const { page, destroy } = await loaded();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const open = vi.spyOn(TestBed.inject(ResultsDialogs), 'open').mockResolvedValue('retry');
    go();

    TestBed.inject(EventBus).publish('race/finish', { timeMs: 61_234, record: true });
    await new Promise((r) => setTimeout(r, 0));
    expect(open).toHaveBeenCalledWith({ mode: 'track', timeMs: 61_234, record: true });
    expect(page.race.director.state.phase).toBe('countdown');

    open.mockResolvedValue('home');
    TestBed.inject(EventBus).publish('race/finish', { timeMs: 61_234, record: false });
    await new Promise((r) => setTimeout(r, 0));
    expect(navigate).toHaveBeenCalledWith(['/']);
    destroy();
  });

  it('shows the results box for real, with the record the package saved', async () => {
    const { destroy } = await loaded();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    go();
    TestBed.inject(EventBus).publish('race/finish', { timeMs: 61_234, record: true });
    await new Promise((r) => setTimeout(r, 0));
    const box = document.querySelector('hr-results-dialog')!;
    expect(box.textContent).toContain('1:01.23');
    expect(box.textContent).toContain('new record');
    box.querySelectorAll('button')[0]!.click();
    destroy();
  });

  it('runs a loop that says no number of laps over the default three', async () => {
    const page = await render('north-ring-01');
    await TestBed.inject(JoltPhysics).load();
    await new Promise((r) => setTimeout(r, 0));
    capture.tick(2, 50);
    expect(page.page.readout.timer().lapCount).toBe(2);
    page.destroy();
  });

  it('draws the touch paddles on a coarse pointer', async () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    } as unknown as MediaQueryList);
    const { host, destroy } = await loaded();
    expect(host.querySelector('hr-touch-paddles')).not.toBeNull();
    expect(localStorage.getItem(BEST_TIMES_KEY)).toBeNull();
    destroy();
  });
});
