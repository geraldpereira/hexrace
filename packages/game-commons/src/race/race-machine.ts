import { Injectable, inject } from '@angular/core';
import { EventBus } from '@hexrace/commons';
import { type LineMark, type Track, TrackMarks } from '@hexrace/track';

import { type RaceRules, DEFAULT_RACE_RULES } from '@game-commons/entity/race-rules';
import { type RaceState, IDLE_RACE_STATE } from '@game-commons/entity/race-state';
import { BestTimes } from '@game-commons/race/best-times';
import { CountdownTimer } from '@game-commons/race/countdown-timer';
import { LapCounter } from '@game-commons/race/lap-counter';
import { RaceClock } from '@game-commons/race/race-clock';

/**
 * The common trunk of every mode (functional spec 4.1): countdown, GO, chrono, laps, finish. It
 * knows nothing of the scene, only of a continuous position handed to it each step; it fills the
 * state the HUD reads and tells the rest of the game through the bus. In Track the race ends when
 * the last lap is closed on the start line, in Rally on the finish line of the last tile.
 */
@Injectable({ providedIn: 'root' })
export class RaceMachine {
  /** The track being raced; without one no crossing is ever counted. */
  track: Track | null = null;
  rules: RaceRules = DEFAULT_RACE_RULES;

  private readonly best = inject(BestTimes);
  private readonly bus = inject(EventBus);
  private readonly clock = inject(RaceClock);
  private readonly countdown = inject(CountdownTimer);
  private readonly laps = inject(LapCounter);
  private readonly marks = inject(TrackMarks);
  private previous = 0;

  /** Puts the state back to the start line and launches the countdown; the GO is three seconds off. */
  start(state: RaceState, position = 0): void {
    Object.assign(state, IDLE_RACE_STATE);
    state.lapCount = this.lapCount();
    state.position = position;
    this.previous = position;
    this.clock.reset();
    this.countdown.start();
  }

  /** One step of the race, from the wall clock and from where the car now stands on the track. */
  update(state: RaceState, position: number): void {
    state.position = position;
    state.countdownStep = this.countdown.step();
    if (state.phase === 'finished') return;
    if (state.phase === 'countdown') {
      if (!this.countdown.done()) {
        this.previous = position;
        return;
      }
      this.go(state);
    }
    state.elapsedMs = this.clock.elapsedMs();
    this.count(state, position);
    this.previous = position;
  }

  /** Where the line that closes a lap or the race stands, as a continuous position. */
  finishLine(track: Track): number {
    const marks = this.marks.marks(track);
    return this.positionOf(marks.find((one: LineMark) => one.kind !== 'start') ?? marks[0]);
  }

  /** Where the line the car sets off from stands, as a continuous position. */
  startLine(track: Track): number {
    return this.positionOf(this.marks.marks(track).find((one: LineMark) => one.kind !== 'finish'));
  }

  private positionOf(mark: LineMark | undefined): number {
    return mark ? mark.tile + mark.at : 0;
  }

  private lapCount(): number {
    return this.rules.mode === 'track' ? Math.max(1, this.rules.laps) : 1;
  }

  private go(state: RaceState): void {
    state.phase = 'racing';
    state.lap = 1;
    state.lapCount = this.lapCount();
    this.clock.start();
    this.bus.publish('race/start', { lapCount: state.lapCount });
  }

  private count(state: RaceState, position: number): void {
    const track = this.track;
    if (!track) return;
    const crossing = this.laps.crossing(
      this.previous,
      position,
      this.finishLine(track),
      track.tiles.length,
      this.rules.mode === 'track',
    );
    if (crossing === 0) return;
    if (this.rules.mode !== 'rally') this.lap(state, track, crossing);
    else if (crossing > 0) this.finish(state, track);
  }

  private lap(state: RaceState, track: Track, crossing: number): void {
    state.lap = Math.max(1, state.lap + crossing);
    if (state.lap > state.lapCount) this.finish(state, track);
    else if (crossing > 0) {
      this.bus.publish('race/lap', { lap: state.lap, lapCount: state.lapCount });
    }
  }

  private finish(state: RaceState, track: Track): void {
    state.phase = 'finished';
    state.lap = Math.min(state.lap, state.lapCount);
    state.elapsedMs = this.clock.stop();
    const record = this.best.record(track.id, state.elapsedMs);
    this.bus.publish('race/finish', { timeMs: state.elapsedMs, record });
  }
}
