import { inputBinding, signal, type Type, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AssistLamps } from '@hud/game/assist-lamps';
import { Countdown } from '@hud/game/countdown';
import { DamageIndicator } from '@hud/game/damage-indicator';
import { intactDamage } from '@hud/game/damage-readout';
import { GearIndicator } from '@hud/game/gear-indicator';
import { RaceTimer, type TimerReadout } from '@hud/game/race-timer';
import { ResetGauge } from '@hud/game/reset-gauge';
import { RevCounter } from '@hud/game/rev-counter';
import { SpeedIndicator } from '@hud/game/speed-indicator';
import { WrongWay } from '@hud/game/wrong-way';

async function render<T>(
  component: Type<T>,
  inputs: Record<string, unknown>,
): Promise<{
  host: HTMLElement;
  set: (name: string, value: unknown) => Promise<void>;
  instance: T;
}> {
  await TestBed.configureTestingModule({ imports: [component] }).compileComponents();
  const signals = new Map<string, WritableSignal<unknown>>(
    Object.entries(inputs).map(([name, value]) => [name, signal(value)]),
  );
  const bindings = [...signals].map(([name, value]) => inputBinding(name, value));
  const fixture = TestBed.createComponent(component, { bindings });
  await fixture.whenStable();
  return {
    host: fixture.nativeElement as HTMLElement,
    instance: fixture.componentInstance,
    set: async (name, value) => {
      signals.get(name)!.set(value);
      fixture.changeDetectorRef.markForCheck();
      await fixture.whenStable();
    },
  };
}

const TIMER: TimerReadout = {
  mode: 'track',
  currentMs: 65_000,
  lap: 2,
  lapCount: 3,
  bestMs: 71_234,
  deltaMs: 1_500,
  splitsMs: [23_456, 51_002],
};

describe('game components', () => {
  let animations: string[];

  beforeEach(() => {
    animations = [];
    Object.defineProperty(Element.prototype, 'animate', {
      configurable: true,
      value(this: Element) {
        const part = this.getAttribute('data-part') ?? this.getAttribute('class') ?? this.tagName;
        animations.push(part);
        return {};
      },
    });
  });

  it('rev counter: arcs, redline and limiter', async () => {
    const { host, instance, set } = await render(RevCounter, {
      rpm: 2000,
      maxRpm: 4000,
      redlineRpm: 3600,
      limiter: false,
    });
    expect(host.querySelector('.value')?.textContent).toBe('2000');
    expect(instance.share()).toBe(0.5);
    expect(host.querySelector('svg')?.classList.contains('redline')).toBe(false);
    expect(instance.arc(0, 0)).toBe('');
    expect(instance.arc(0, 1)).toMatch(/^M .* A 44 44 0 1 1 .*$/);
    expect(instance.arc(0, 0.25)).toMatch(/ 0 0 1 /);
    expect(instance.arc(0, 0.6)).toMatch(/ 0 0 1 /);
    expect(instance.arc(0, 0.7)).toMatch(/ 0 1 1 /);
    await set('rpm', 3800);
    await set('limiter', true);
    const svg = host.querySelector('svg')!;
    expect(svg.classList.contains('redline')).toBe(true);
    expect(svg.classList.contains('limiter')).toBe(true);
    await set('rpm', 9000);
    expect(instance.share()).toBe(1);
  });

  it('gear indicator: R, N, numbers and the shift hint', async () => {
    const { host, set } = await render(GearIndicator, { gear: -1, shiftHint: false });
    expect(host.querySelector('.gear')?.textContent).toBe('R');
    expect(animations).toEqual(['gear']);
    await set('gear', 0);
    expect(host.querySelector('.gear')?.textContent).toBe('N');
    await set('gear', 3);
    expect(host.querySelector('.gear')?.textContent).toBe('3');
    expect(animations.length).toBe(3);
    expect(host.querySelector('.hint')).toBeNull();
    await set('shiftHint', true);
    expect(host.querySelector('.hint')).not.toBeNull();
  });

  it('speed indicator: rounded, never negative', async () => {
    const { host, set } = await render(SpeedIndicator, { kmh: 63.6 });
    expect(host.querySelector('.value')?.textContent).toBe('64');
    await set('kmh', -3);
    expect(host.querySelector('.value')?.textContent).toBe('0');
  });

  it('damage indicator: a colour per state and a pulse on the hit part', async () => {
    const damage = { ...intactDamage(), engine: 0, wheelFL: 50 };
    const { host, instance, set } = await render(DamageIndicator, { damage, hit: null });
    expect(instance.colour('chassis')).toBe('hsl(120 80% 45%)');
    expect(instance.colour('engine')).toBe('hsl(0 80% 45%)');
    expect(instance.colour('wheelFL')).toBe('hsl(60 80% 45%)');
    expect(host.querySelectorAll('.part').length).toBe(12);
    expect(animations).toEqual([]);
    await set('hit', 'engine');
    expect(animations).toEqual(['engine']);
  });

  it('race timer: track shows laps, best and delta; rally the splits; collapse the time held', async () => {
    const { host, set } = await render(RaceTimer, { readout: TIMER });
    expect(host.querySelector('.current')?.textContent).toBe('1:05.000');
    expect(host.querySelector('.line')?.textContent).toContain('lap 2/3');
    expect(host.querySelector('.best')?.textContent).toBe('best 1:11.234');
    expect(host.querySelector('.delta')?.textContent).toBe('+1.500');
    expect(host.querySelector('.delta')?.classList.contains('behind')).toBe(true);
    await set('readout', { ...TIMER, bestMs: null, deltaMs: null });
    expect(host.querySelector('.best')?.textContent).toBe('best --');
    expect(host.querySelector('.delta')).toBeNull();
    await set('readout', { ...TIMER, mode: 'rally' });
    expect(host.querySelectorAll('.splits li').length).toBe(2);
    await set('readout', { ...TIMER, mode: 'collapse' });
    expect(host.querySelector('.line')?.textContent).toContain('held');
  });

  it('countdown: a step, GO, nothing', async () => {
    const { host, set } = await render(Countdown, { step: 3 });
    expect(host.querySelector('.step')?.textContent).toBe('3');
    await set('step', 0);
    expect(host.querySelector('.step')?.textContent).toBe('GO');
    expect(host.querySelector('.step')?.classList.contains('go')).toBe(true);
    expect(animations.length).toBe(2);
    await set('step', null);
    expect(host.querySelector('.step')).toBeNull();
  });

  it('reset gauge: hidden at rest, a ring filling with progress', async () => {
    const { host, instance, set } = await render(ResetGauge, { progress: 0 });
    expect(host.querySelector('svg')).toBeNull();
    await set('progress', 0.5);
    expect(host.querySelector('svg')).not.toBeNull();
    expect(instance.offset()).toBeCloseTo(instance.circumference / 2, 5);
    await set('progress', 2);
    expect(instance.offset()).toBe(0);
  });

  it('wrong way: a banner only while active', async () => {
    const { host, set } = await render(WrongWay, { active: false });
    expect(host.querySelector('.banner')).toBeNull();
    await set('active', true);
    expect(host.querySelector('.banner')?.textContent).toContain('wrong way');
  });

  it('assist lamps: one per owned assist, lit while acting', async () => {
    const { host, set } = await render(AssistLamps, {
      assists: { abs: false, tractionControl: null },
    });
    expect(host.querySelectorAll('.lamp').length).toBe(1);
    expect(host.querySelector('.lamp')?.classList.contains('on')).toBe(false);
    await set('assists', { abs: true, tractionControl: true });
    expect(host.querySelectorAll('.lamp.on').length).toBe(2);
  });
});
