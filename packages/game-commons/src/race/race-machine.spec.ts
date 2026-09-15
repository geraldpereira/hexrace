import { TestBed } from '@angular/core/testing';
import { Clock, EventBus } from '@hexrace/commons';
import { type Track, TrackExamples } from '@hexrace/track';

import { type RaceFinish, type RaceLap, type RaceStart } from '@game-commons/entity/race-events';
import { DEFAULT_LAPS } from '@game-commons/entity/race-rules';
import { type RaceState, IDLE_RACE_STATE } from '@game-commons/entity/race-state';
import { rallyTrack } from '@game-commons/entity/track.mock';
import { FakeClock } from '@game-commons/race/clock.mock';
import { RaceMachine } from '@game-commons/race/race-machine';

describe('RaceMachine', () => {
  let clock: FakeClock;
  let machine: RaceMachine;
  let state: RaceState;
  let ring: Track;
  const starts: RaceStart[] = [];
  const laps: RaceLap[] = [];
  const finishes: RaceFinish[] = [];

  beforeEach(() => {
    localStorage.clear();
    clock = new FakeClock();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: Clock, useValue: clock }] });
    machine = TestBed.inject(RaceMachine);
    state = { ...IDLE_RACE_STATE };
    starts.length = laps.length = finishes.length = 0;
    const bus = TestBed.inject(EventBus);
    bus.on('race/start', (event: RaceStart) => starts.push(event));
    bus.on('race/lap', (event: RaceLap) => laps.push(event));
    bus.on('race/finish', (event: RaceFinish) => finishes.push(event));
    ring = TestBed.inject(TrackExamples).of('europe-loop-01')!;
  });

  function race(track: Track, laps = DEFAULT_LAPS): void {
    machine.track = track;
    machine.rules = { mode: track.mode, laps };
    machine.start(state, machine.startLine(track));
  }

  function tick(seconds: number, position = state.position): void {
    clock.tick(seconds);
    machine.update(state, position);
  }

  function drive(...positions: number[]): void {
    for (const position of positions) tick(0.5, position);
  }

  const AROUND = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 11.9, 0.6];

  it('reads the line of a loop on the first tile and that of a rally on the last', () => {
    expect(machine.finishLine(ring)).toBeCloseTo(0.5, 9);
    expect(machine.startLine(ring)).toBeCloseTo(0.5, 9);
    const rally = rallyTrack(4);
    expect(machine.startLine(rally)).toBeCloseTo(0.5, 9);
    expect(machine.finishLine(rally)).toBeCloseTo(3.5, 9);
    const empty = rallyTrack(0);
    expect(machine.finishLine(empty)).toBe(0);
    expect(machine.startLine(empty)).toBe(0);
  });

  it('counts down for three seconds, then gives the GO and starts the chrono', () => {
    race(ring);
    expect(state.phase).toBe('countdown');
    expect(state.countdownStep).toBeNull();
    tick(0);
    expect(state.countdownStep).toBe(3);
    tick(1);
    expect(state.countdownStep).toBe(2);
    expect(state.elapsedMs).toBe(0);
    tick(2);
    expect(state.phase).toBe('racing');
    expect(state.lap).toBe(1);
    expect(state.lapCount).toBe(DEFAULT_LAPS);
    expect(starts).toEqual([{ lapCount: DEFAULT_LAPS }]);
    tick(1.5);
    expect(state.elapsedMs).toBe(1500);
    expect(state.countdownStep).toBeNull();
  });

  it('counts a lap at each crossing and ends the race on the last one', () => {
    race(ring, 2);
    tick(3);
    drive(...AROUND);
    expect(state.lap).toBe(2);
    expect(laps).toEqual([{ lap: 2, lapCount: 2 }]);
    drive(...AROUND);
    expect(state.phase).toBe('finished');
    expect(state.lap).toBe(2);
    expect(state.elapsedMs).toBe(13_000);
    expect(finishes).toEqual([{ timeMs: 13_000, record: true }]);
  });

  it('gives a lap back to whoever crosses the line backwards, and never goes under the first', () => {
    race(ring, 3);
    tick(3);
    drive(...AROUND);
    expect(state.lap).toBe(2);
    drive(0.4);
    expect(state.lap).toBe(1);
    drive(11.9, 11.5);
    expect(state.lap).toBe(1);
    expect(laps).toEqual([{ lap: 2, lapCount: 3 }]);
  });

  it('ends a rally at the finish line of the last tile, and not on the way back', () => {
    const rally = rallyTrack(4);
    race(rally);
    tick(3);
    expect(state.lapCount).toBe(1);
    drive(1, 2, 3, 3.4, 3.6);
    expect(state.phase).toBe('finished');
    expect(finishes[0]?.timeMs).toBe(2500);
    drive(3.4);
    expect(state.phase).toBe('finished');
    expect(state.elapsedMs).toBe(2500);
  });

  it('refuses to end a rally driven backwards over the finish line', () => {
    const rally = rallyTrack(4);
    machine.track = rally;
    machine.rules = { mode: 'rally', laps: 1 };
    machine.start(state, 3.6);
    tick(3);
    drive(3.4);
    expect(state.phase).toBe('racing');
  });

  it('calls a second run a record only when it beats the first', () => {
    const rally = rallyTrack(4);
    race(rally);
    tick(3);
    tick(20, 3.6);
    race(rally);
    tick(3);
    tick(30, 3.6);
    expect(finishes.map((one: RaceFinish) => one.record)).toEqual([true, false]);
  });

  it('counts nothing without a track, and asks at least one lap', () => {
    machine.track = null;
    machine.rules = { mode: 'track', laps: 0 };
    machine.start(state);
    expect(state.lapCount).toBe(1);
    tick(3);
    expect(state.phase).toBe('racing');
    drive(0.2, 0.6);
    expect(state.phase).toBe('racing');
    expect(state.lap).toBe(1);
  });
});
