import { inputBinding, signal, type Type, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { CanvasFrame } from '@hud/commons/canvas-frame';
import { CarCard, type CarSummary } from '@hud/commons/car-card';
import { Credits } from '@hud/commons/credits';
import { StatBars } from '@hud/commons/stat-bars';
import { TrackCard, type TrackSummary } from '@hud/commons/track-card';

async function render<T>(
  component: Type<T>,
  inputs: Record<string, unknown>,
): Promise<HTMLElement> {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({ imports: [component] }).compileComponents();
  const bindings = Object.entries(inputs).map(([name, value]) => inputBinding(name, signal(value)));
  const fixture = TestBed.createComponent(component, { bindings });
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

const TRACK: TrackSummary = {
  name: 'Col',
  environment: 'Europe',
  lengthM: 4820,
  bestMs: 71_234,
  locked: false,
  thumbnail: 'data:image/png;base64,',
};

const CAR: CarSummary = {
  name: 'Berlinette',
  price: 8000,
  locked: false,
  transmission: 'RWD',
  stats: [{ label: 'Top speed', value: 0.7 }],
};

describe('commons components', () => {
  it('draws stat bars as shares', async () => {
    const host = await render(StatBars, { stats: CAR.stats });
    expect(host.querySelector('dt')?.textContent).toBe('Top speed');
    expect(host.querySelector<HTMLElement>('.fill')!.style.width).toBe('70%');
  });

  it('formats the credits with a coin', async () => {
    const host = await render(Credits, { amount: 12_500 });
    expect(host.querySelector('span')?.textContent).toBe('12,500');
    expect(host.querySelector('mat-icon')?.textContent).toBe('paid');
  });

  it('shows a track with its best time and thumbnail, and a locked one greyed with a lock', async () => {
    const host = await render(TrackCard, { track: TRACK });
    expect(host.querySelector('h3')?.textContent).toBe('Col');
    expect(host.querySelector('.meta')?.textContent).toContain('4.8 km');
    expect(host.querySelector('.best span')?.textContent).toBe('1:11.234');
    expect(host.querySelector('img')).not.toBeNull();
    expect(host.querySelector('.lock')).toBeNull();

    const locked = await render(TrackCard, {
      track: { ...TRACK, locked: true, bestMs: null, thumbnail: null },
    });
    expect(locked.querySelector('article')?.classList.contains('locked')).toBe(true);
    expect(locked.querySelector('.best span')?.textContent).toBe('no time yet');
    expect(locked.querySelector('.lock')).not.toBeNull();
    expect(locked.querySelector('img')).toBeNull();
  });

  it('shows a car with its price, or owned, or locked', async () => {
    const host = await render(CarCard, { car: CAR });
    expect(host.querySelector('hr-credits span')?.textContent).toBe('8,000');
    const owned = await render(CarCard, { car: { ...CAR, price: null } });
    expect(owned.querySelector('.price span')?.textContent).toBe('owned');
    const locked = await render(CarCard, { car: { ...CAR, price: null, locked: true } });
    expect(locked.querySelector('.price span')?.textContent).toBe('locked');
    expect(locked.querySelector('.lock')).not.toBeNull();
  });

  it('adopts the canvas it is given and reports its size', async () => {
    const observers: ResizeObserverCallback[] = [];
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb: ResizeObserverCallback) {
          observers.push(cb);
        }
        observe(): void {
          // Nothing is laid out in jsdom; the test fires the callback itself.
        }
        disconnect(): void {
          // Nothing to disconnect.
        }
      },
    );
    const canvas = document.createElement('canvas');
    await TestBed.configureTestingModule({ imports: [CanvasFrame] }).compileComponents();
    const source: WritableSignal<HTMLCanvasElement> = signal(canvas);
    const fixture = TestBed.createComponent(CanvasFrame, {
      bindings: [inputBinding('canvas', source)],
    });
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).firstElementChild).toBe(canvas);
    const emitted: unknown[] = [];
    fixture.componentInstance.resized.subscribe((s) => emitted.push(s));
    observers[0]?.(
      [{ contentRect: { width: 320.4, height: 180 } } as ResizeObserverEntry],
      {} as ResizeObserver,
    );
    expect(fixture.componentInstance.size()).toEqual({ width: 320, height: 180 });
    observers[0]?.([], {} as ResizeObserver);
    expect(fixture.componentInstance.size()).toEqual({ width: 320, height: 180 });
    expect(emitted).toEqual([{ width: 320, height: 180 }]);
    fixture.destroy();
  });
});
