import { TestBed } from '@angular/core/testing';
import { Clock } from '@hexrace/commons';

import { FakeClock } from '@game-commons/race/clock.mock';
import { CountdownTimer } from '@game-commons/race/countdown-timer';

describe('CountdownTimer', () => {
  let clock: FakeClock;
  let countdown: CountdownTimer;

  beforeEach(() => {
    clock = new FakeClock();
    TestBed.configureTestingModule({ providers: [{ provide: Clock, useValue: clock }] });
    countdown = TestBed.inject(CountdownTimer);
  });

  it('shows nothing and counts nothing before it starts', () => {
    expect(countdown.step()).toBeNull();
    expect(countdown.seconds()).toBe(0);
    expect(countdown.done()).toBe(false);
  });

  it('runs three, two, one, GO, then clears a second after the GO', () => {
    countdown.start();
    expect(countdown.step()).toBe(3);
    clock.tick(1);
    expect(countdown.step()).toBe(2);
    clock.tick(1);
    expect(countdown.step()).toBe(1);
    expect(countdown.done()).toBe(false);
    clock.tick(1);
    expect(countdown.step()).toBe(0);
    expect(countdown.done()).toBe(true);
    clock.tick(1);
    expect(countdown.step()).toBeNull();
    expect(countdown.done()).toBe(true);
  });

  it('forgets a countdown that was reset', () => {
    countdown.start();
    clock.tick(5);
    countdown.reset();
    expect(countdown.step()).toBeNull();
    expect(countdown.done()).toBe(false);
  });
});
