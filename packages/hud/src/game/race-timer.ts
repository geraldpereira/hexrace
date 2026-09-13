import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { formatTime } from '@hud/commons/format-time';

export type RaceMode = 'track' | 'rally' | 'collapse';

/** What the timer shows: the current time and what the mode adds (functional spec 7.5). */
export interface TimerReadout {
  readonly mode: RaceMode;
  readonly currentMs: number;
  /** Track: lap n of N. */
  readonly lap: number;
  readonly lapCount: number;
  /** Track: best lap and the gap of the current lap to it. */
  readonly bestMs: number | null;
  readonly deltaMs: number | null;
  /** Rally: split times passed so far. */
  readonly splitsMs: readonly number[];
}

@Component({
  selector: 'hr-race-timer',
  template: `
    <div class="current">{{ currentText() }}</div>
    @switch (readout().mode) {
      @case ('track') {
        <div class="line">
          <span>lap {{ readout().lap }}/{{ readout().lapCount }}</span>
          <span class="best">best {{ bestText() }}</span>
        </div>
        @if (deltaText(); as delta) {
          <div class="delta" [class.behind]="readout().deltaMs! > 0">{{ delta }}</div>
        }
      }
      @case ('rally') {
        <ol class="splits">
          @for (split of readout().splitsMs; track $index) {
            <li>{{ format(split) }}</li>
          }
        </ol>
      }
      @default {
        <div class="line"><span>held</span></div>
      }
    }
  `,
  styles: `
    :host {
      display: block;
      font-variant-numeric: tabular-nums;
      text-align: right;
    }
    .current {
      font-size: 1.8rem;
      font-weight: 600;
      line-height: 1;
    }
    .line {
      display: flex;
      justify-content: flex-end;
      gap: 0.8rem;
      font-size: 0.8rem;
      opacity: 0.85;
      margin-top: 0.2rem;
    }
    .delta {
      font-size: 1rem;
      font-weight: 600;
      color: var(--hr-ok, #4cd964);
    }
    .delta.behind {
      color: var(--hr-danger, #ff3b3b);
    }
    .splits {
      margin: 0.2rem 0 0;
      padding: 0;
      list-style: none;
      font-size: 0.8rem;
      opacity: 0.85;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RaceTimer {
  readonly readout = input.required<TimerReadout>();
  readonly currentText = computed(() => formatTime(this.readout().currentMs));
  readonly bestText = computed(() => {
    const best = this.readout().bestMs;
    return best === null ? '--' : formatTime(best);
  });
  readonly deltaText = computed(() => {
    const delta = this.readout().deltaMs;
    return delta === null ? null : formatTime(delta, { signed: true });
  });

  format(ms: number): string {
    return formatTime(ms);
  }
}
