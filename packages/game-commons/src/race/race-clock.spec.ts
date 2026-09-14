import { TestBed } from '@angular/core/testing';
import { Clock } from '@hexrace/commons';

import { FakeClock } from '@game-commons/race/clock.mock';
import { RaceClock } from '@game-commons/race/race-clock';

describe('RaceClock', () => {
  let clock: FakeClock;
  let race: RaceClock;

  beforeEach(() => {
    clock = new FakeClock();
    TestBed.configureTestingModule({ providers: [{ provide: Clock, useValue: clock }] });
    race = TestBed.inject(RaceClock);
  });

  it('reads nothing before the GO, then the real time since it', () => {
    expect(race.running).toBe(false);
    expect(race.elapsedMs()).toBe(0);
    race.start();
    expect(race.running).toBe(true);
    clock.tick(12.5);
    expect(race.elapsedMs()).toBe(12500);
  });

  it('keeps the time it was stopped at, and starts afresh after a reset', () => {
    race.start();
    clock.tick(4);
    expect(race.stop()).toBe(4000);
    clock.tick(10);
    expect(race.elapsedMs()).toBe(4000);
    expect(race.stop()).toBe(4000);
    expect(race.running).toBe(false);
    race.reset();
    expect(race.elapsedMs()).toBe(0);
    race.start();
    clock.tick(1);
    expect(race.elapsedMs()).toBe(1000);
  });
});
