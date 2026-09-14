import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  AssistLamps,
  CanvasFrame,
  CarCard,
  Countdown,
  Credits,
  DAMAGE_PARTS,
  DamageIndicator,
  DebugPanel,
  GearIndicator,
  RaceTimer,
  ResetGauge,
  ResultsDialogs,
  RevCounter,
  SpeedIndicator,
  StatBars,
  TrackCard,
  WrongWay,
  FrameLoop,
  INTACT_DAMAGE,
  type AssistReadout,
  type CarSummary,
  type DamagePart,
  type DamageReadout,
  type DebugFolder,
  type FrameSize,
  type RaceMode,
  type TimerReadout,
  type TrackSummary,
} from '@hexrace/hud';

/** The fake race the debug panel drives; every field is a control of the HUD folder. */
class FakeRace {
  rpm = 2400;
  maxRpm = 4500;
  redlineRpm = 3900;
  limiter = false;
  gear = 2;
  shiftHint = false;
  kmh = 63;
  mode: RaceMode = 'track';
  running = true;
  currentMs = 0;
  lap = 1;
  lapCount = 3;
  bestMs = 71_234;
  deltaMs = -1234;
  resetProgress = 0;
  wrongWay = false;
  absOwned = true;
  absOn = false;
  tcOwned = false;
  tcOn = false;
  credits = 12_500;
  hitPart: DamagePart = 'wheelFL';
  readonly damage: Record<DamagePart, number> = { ...INTACT_DAMAGE };
}

/**
 * The HUD showcase: every game component and every commons component on one page, fed with the
 * fake race the debug panel drives, so tuning sizes and colours needs no car (functional spec 7.5).
 */
@Component({
  selector: 'hr-hud-showcase',
  imports: [
    RouterLink,
    RevCounter,
    GearIndicator,
    SpeedIndicator,
    DamageIndicator,
    RaceTimer,
    Countdown,
    ResetGauge,
    WrongWay,
    AssistLamps,
    CanvasFrame,
    StatBars,
    Credits,
    TrackCard,
    CarCard,
  ],
  templateUrl: './hud-showcase.html',
  styleUrl: './hud-showcase.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HudShowcase {
  readonly race = new FakeRace();
  readonly canvas = document.createElement('canvas');
  readonly rpm = signal(this.race.rpm);
  readonly gear = signal(this.race.gear);
  readonly kmh = signal(this.race.kmh);
  readonly damage = signal<DamageReadout>({ ...this.race.damage });
  readonly hit = signal<DamagePart | null>(null);
  readonly timer = signal<TimerReadout>(this.timerReadout());
  readonly countdownStep = signal<number | null>(null);
  readonly assists = signal<AssistReadout>({ abs: false, tractionControl: null });
  readonly track: TrackSummary = {
    name: 'Col des Aravis',
    environment: 'Europe',
    lengthM: 4820,
    bestMs: 71_234,
    locked: false,
    thumbnail: null,
  };
  readonly lockedTrack: TrackSummary = {
    ...this.track,
    name: 'Erg Chebbi',
    environment: 'Africa',
    bestMs: null,
    locked: true,
  };
  readonly car: CarSummary = {
    name: 'Berlinette',
    price: 8_000,
    locked: false,
    transmission: 'RWD',
    stats: [
      { label: 'Top speed', value: 0.7 },
      { label: 'Acceleration', value: 0.8 },
      { label: 'Sturdiness', value: 0.4 },
    ],
  };
  readonly ownedCar: CarSummary = {
    ...this.car,
    name: 'Starter',
    price: null,
    transmission: 'FWD',
  };

  private frameSize: FrameSize = { width: 0, height: 0 };
  private readonly panel = inject(DebugPanel);
  private readonly results = inject(ResultsDialogs);
  private last = 0;

  constructor() {
    this.panel.register('HUD', (f: DebugFolder) => this.buildFolder(f), inject(DestroyRef));
    this.panel.show();
    inject(FrameLoop).start((now: number) => this.tick(now));
  }

  /** The frame tells us its box; the canvas takes that resolution before the next paint. */
  onResized(size: FrameSize): void {
    this.frameSize = size;
  }

  private tick(now: number): void {
    const dt = this.last ? (now - this.last) / 1000 : 0;
    this.last = now;
    const r = this.race;
    if (r.running) r.currentMs += dt * 1000;
    this.rpm.set(r.rpm);
    this.gear.set(r.gear);
    this.kmh.set(r.kmh);
    this.timer.set(this.timerReadout());
    this.assists.set({
      abs: r.absOwned ? r.absOn : null,
      tractionControl: r.tcOwned ? r.tcOn : null,
    });
    this.paintFakeCanvas(now);
  }

  private timerReadout(): TimerReadout {
    const r = this.race;
    return {
      mode: r.mode,
      currentMs: r.currentMs,
      lap: r.lap,
      lapCount: r.lapCount,
      bestMs: r.bestMs,
      deltaMs: r.deltaMs,
      splitsMs: [23_456, 51_002],
    };
  }

  private paintFakeCanvas(now: number): void {
    const size = this.frameSize;
    if (
      size.width > 0 &&
      (this.canvas.width !== size.width || this.canvas.height !== size.height)
    ) {
      this.canvas.width = size.width;
      this.canvas.height = size.height;
    }
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = this.canvas;
    ctx.fillStyle = '#243447';
    ctx.fillRect(0, 0, width, height);
    const half = 12;
    ctx.fillStyle = '#ffaa00';
    const x = half + ((width - 2 * half) / 2) * (1 + Math.sin(now / 800));
    ctx.fillRect(x - half, height / 2 - half, 2 * half, 2 * half);
    ctx.fillStyle = '#4cd964';
    const y = half + ((height - 2 * half) / 2) * (1 + Math.sin(now / 1100));
    ctx.fillRect(width / 2 - half, y - half, 2 * half, 2 * half);
  }

  private buildFolder(folder: DebugFolder): void {
    const r = this.race;
    const dash = folder.addFolder('Dashboard');
    dash.add(r, 'rpm', 0, 6000, 10).name('RPM');
    dash.add(r, 'maxRpm', 3000, 9000, 100).name('Max RPM');
    dash.add(r, 'redlineRpm', 2000, 9000, 100).name('Redline RPM');
    dash.add(r, 'limiter').name('Limiter');
    dash.add(r, 'gear', -1, 9, 1).name('Gear');
    dash.add(r, 'shiftHint').name('Shift hint');
    dash.add(r, 'kmh', 0, 250, 1).name('Speed (km/h)');
    const timer = folder.addFolder('Timer');
    timer.add(r, 'mode', ['track', 'rally', 'collapse']).name('Mode');
    timer.add(r, 'running').name('Running');
    timer.add(r, 'lap', 1, 9, 1).name('Lap');
    timer.add(r, 'lapCount', 1, 9, 1).name('Laps');
    timer.add(r, 'deltaMs', -10_000, 10_000, 100).name('Delta (ms)');
    timer.add({ start: () => this.startCountdown() }, 'start').name('Start countdown');
    const dmg = folder.addFolder('Damage');
    for (const part of DAMAGE_PARTS) {
      dmg.add(r.damage, part, 0, 100, 1).onChange(() => this.damage.set({ ...r.damage }));
    }
    dmg.add(r, 'hitPart', [...DAMAGE_PARTS]).name('Hit part');
    dmg.add({ hit: () => this.hitPart() }, 'hit').name('Hit!');
    const misc = folder.addFolder('Signals');
    misc.add(r, 'resetProgress', 0, 1, 0.01).name('Reset progress');
    misc.add(r, 'wrongWay').name('Wrong way');
    misc.add(r, 'absOwned').name('ABS owned');
    misc.add(r, 'absOn').name('ABS acting');
    misc.add(r, 'tcOwned').name('TC owned');
    misc.add(r, 'tcOn').name('TC acting');
    misc.add(r, 'credits', 0, 100_000, 100).name('Credits');
    misc
      .add(
        {
          results: () =>
            void this.results.open({ mode: r.mode, timeMs: r.currentMs, record: true }),
        },
        'results',
      )
      .name('Results dialog');
  }

  private hitPart(): void {
    const r = this.race;
    r.damage[r.hitPart] = Math.max(0, r.damage[r.hitPart] - 25);
    this.damage.set({ ...r.damage });
    this.hit.set(null);
    this.hit.set(r.hitPart);
  }

  private startCountdown(): void {
    const steps = [3, 2, 1, 0, null];
    steps.forEach((step, i) => {
      setTimeout(() => this.countdownStep.set(step), i * 1000);
    });
  }
}
