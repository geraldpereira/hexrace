import { inject } from '@angular/core';
import { Random } from '@hexrace/commons';
import { GameComponent } from '@hexrace/engine';

import { EngineModel } from '@car/drive/engine-model';
import { type CarReadout } from '@car/entity/car-readout';
import { AudioHub, type Voice } from '@car/audio/audio-hub';
import { EngineWorklet } from '@car/audio/engine-worklet';

const SHIFT_LOAD = 0.5;
const POP_THROTTLE = 0.3;
const POP_MIN_REV_SHARE = 0.3;
const POPS_MIN = 1;
const POPS_MAX = 3;
const OVERRUN_LIFT_FROM = 0.5;
const OVERRUN_THROTTLE = 0.1;
const OVERRUN_MIN_REV_SHARE = 0.5;

interface EngineMessage {
  rpm: number;
  load: number;
  limiter?: boolean;
  pops?: number;
}

/**
 * The engine, procedural, no sample (POC 1, and the user decided it firmly). This component only
 * feeds the worklet: the revs and the load every frame, the tuning when the panel changes it, the
 * limiter as an edge, and the exhaust pops — one or two on a lifted downshift, one or two when the
 * foot comes off a hard pull, then a random crackle while coasting high. It owns the final
 * low-pass, opened by revs and by load, because a coasting engine is duller than one pulling.
 */
export class EngineSound extends GameComponent {
  readout!: CarReadout;
  enabled = true;
  volume = 0.5;
  cylinders = 4;
  exhaustHz = 110;
  resonance = 1;
  intakeNoise = 0.15;
  drive = 1.5;
  wobble = 0.02;
  limiterHz = 14;
  popLevel = 1.4;
  unevenness = 0.6;
  /** Average crackles per second while coasting at the ceiling. */
  overrunRate = 2;
  filterBaseHz = 600;
  filterRpmHz = 1500;
  filterLoadHz = 2500;

  private readonly hub = inject(AudioHub);
  private readonly worklet = inject(EngineWorklet);
  private readonly engine = inject(EngineModel);
  private readonly rng = inject(Random).fresh();
  private voice: Voice | null = null;
  private dead = false;
  private previousGear = 0;
  private previousLimiter = false;
  private previousThrottle = 0;

  override start(): void {
    this.hub.whenReady((context: AudioContext) => {
      void this.build(context);
    });
  }

  override render(dt: number): void {
    const voice = this.voice;
    if (!voice) return;
    const state = this.readout.state;
    const rpm = Math.max(state.rpm, 0);
    const share = this.engine.revShare(rpm, state.maxRpm);
    const load = state.shifting ? state.throttle * SHIFT_LOAD : state.throttle;
    const message: EngineMessage = { rpm, load };
    if (state.limiter !== this.previousLimiter) {
      message.limiter = state.limiter;
      this.previousLimiter = state.limiter;
    }
    const pops = this.pops(share, dt);
    if (pops > 0) message.pops = pops;
    this.hub.send(voice, message);
    this.hub.cutoff(voice, this.filterBaseHz + share * this.filterRpmHz + load * this.filterLoadHz);
    this.hub.level(voice, this.enabled ? this.volume : 0);
  }

  /** Pushes the timbre knobs into the worklet; the panel calls it on every change. */
  tune(): void {
    this.hub.send(this.voice, {
      cylinders: this.cylinders,
      exhaustHz: this.exhaustHz,
      resonance: this.resonance,
      intakeNoise: this.intakeNoise,
      drive: this.drive,
      wobble: this.wobble,
      limiterHz: this.limiterHz,
      popLevel: this.popLevel,
      unevenness: this.unevenness,
    });
  }

  /** Fires a couple of pops on demand: the panel's test button. */
  testPops(): void {
    this.hub.send(this.voice, { pops: 2 });
  }

  override onDestroy(): void {
    this.dead = true;
    this.hub.close(this.voice);
    this.voice = null;
  }

  private pops(share: number, dt: number): number {
    const state = this.readout.state;
    const gear = state.gear;
    const downshift = gear < this.previousGear && gear > 0;
    this.previousGear = gear;
    const lifted = this.previousThrottle >= OVERRUN_LIFT_FROM && state.throttle < OVERRUN_THROTTLE;
    this.previousThrottle = state.throttle;
    let pops = 0;
    if (downshift && state.throttle <= POP_THROTTLE && share >= POP_MIN_REV_SHARE) {
      pops += POPS_MIN + this.rng.int(POPS_MAX - POPS_MIN + 1);
    }
    const high = share >= OVERRUN_MIN_REV_SHARE && !state.shifting;
    if (high && lifted) pops += 1 + this.rng.int(2);
    if (high && state.throttle < OVERRUN_THROTTLE) {
      const rate =
        (this.overrunRate * (share - OVERRUN_MIN_REV_SHARE)) / (1 - OVERRUN_MIN_REV_SHARE);
      if (this.rng.chance(rate * dt)) pops += 1;
    }
    return pops;
  }

  private async build(context: AudioContext): Promise<void> {
    const voice = await this.hub.openFor(context, this.worklet, true, () => this.dead);
    if (!voice) return;
    this.voice = voice;
    this.tune();
  }
}
