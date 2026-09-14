import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { clamp } from 'lodash-es';

const START_DEG = -135;
const SWEEP_DEG = 270;
const RADIUS = 44;

/**
 * The rev counter: an arc from the start angle over 270°, red from the shift-up rpm, blinking on
 * the limiter, and the revs as a number (functional spec 7.5). The box stops just under the arc's
 * ends, so the counter sits on the same baseline as its neighbours. The car's module feeds it.
 */
@Component({
  selector: 'hr-rev-counter',
  template: `
    <svg viewBox="-50 -50 100 86" [class.limiter]="limiter()" [class.redline]="inRed()">
      <path class="track" [attr.d]="arc(0, 1)" />
      <path class="red" [attr.d]="arc(redShare(), 1)" />
      <path class="fill" [attr.d]="arc(0, share())" />
      <text class="value" y="8">{{ rpmText() }}</text>
      <text class="unit" y="22">rpm</text>
    </svg>
  `,
  styles: `
    :host {
      display: block;
      width: 8rem;
      aspect-ratio: 100 / 86;
    }
    svg {
      width: 100%;
      height: 100%;
    }
    path {
      fill: none;
      stroke-width: 7;
      stroke-linecap: butt;
    }
    .track {
      stroke: var(--hr-track, rgba(255, 255, 255, 0.12));
    }
    .red {
      stroke: color-mix(in srgb, var(--hr-danger, var(--hr-danger, #ff3b3b)) 45%, transparent);
    }
    .fill {
      stroke: var(--hr-accent, #ffaa00);
    }
    .redline .fill {
      stroke: var(--hr-danger, #ff3b3b);
    }
    .limiter .fill {
      animation: blink 0.12s steps(2, end) infinite;
    }
    @keyframes blink {
      to {
        opacity: 0.25;
      }
    }
    text {
      fill: var(--hr-text, #e8edf2);
      text-anchor: middle;
      font-variant-numeric: tabular-nums;
    }
    .value {
      font-size: 18px;
      font-weight: 600;
    }
    .unit {
      font-size: 8px;
      opacity: 0.7;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RevCounter {
  readonly rpm = input.required<number>();
  readonly maxRpm = input.required<number>();
  readonly redlineRpm = input.required<number>();
  readonly limiter = input(false);

  readonly share = computed(() => clamp(this.rpm() / this.maxRpm(), 0, 1));
  readonly redShare = computed(() => clamp(this.redlineRpm() / this.maxRpm(), 0, 1));
  readonly inRed = computed(() => this.rpm() >= this.redlineRpm());
  readonly rpmText = computed(() => String(Math.round(this.rpm() / 10) * 10));

  /** An SVG arc path from one share of the sweep to another. */
  arc(from: number, to: number): string {
    if (to <= from) return '';
    const a0 = ((START_DEG + from * SWEEP_DEG) * Math.PI) / 180;
    const a1 = ((START_DEG + to * SWEEP_DEG) * Math.PI) / 180;
    const large = (to - from) * SWEEP_DEG > 180 ? 1 : 0;
    const p = (a: number): string =>
      `${(RADIUS * Math.sin(a)).toFixed(2)} ${(-RADIUS * Math.cos(a)).toFixed(2)}`;
    return `M ${p(a0)} A ${String(RADIUS)} ${String(RADIUS)} 0 ${String(large)} 1 ${p(a1)}`;
  }
}
