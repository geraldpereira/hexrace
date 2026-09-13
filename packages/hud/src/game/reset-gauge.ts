import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const RADIUS = 20;

/** A ring filling over the three seconds the reset is held (functional spec 3.8 and 7.5). */
@Component({
  selector: 'hr-reset-gauge',
  template: `
    @if (progress() > 0) {
      <svg viewBox="-25 -25 50 50">
        <circle class="track" r="20" />
        <circle
          class="fill"
          r="20"
          [attr.stroke-dasharray]="circumference"
          [attr.stroke-dashoffset]="offset()"
        />
        <text y="4">reset</text>
      </svg>
    }
  `,
  styles: `
    :host {
      display: block;
      width: 4rem;
      aspect-ratio: 1;
    }
    svg {
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);
    }
    circle {
      fill: none;
      stroke-width: 4;
    }
    .track {
      stroke: rgba(255, 255, 255, 0.15);
    }
    .fill {
      stroke: #ffaa00;
      stroke-linecap: round;
    }
    text {
      fill: #e8edf2;
      font-size: 7px;
      text-anchor: middle;
      transform: rotate(90deg);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetGauge {
  /** 0 idle to 1 about to reset. */
  readonly progress = input.required<number>();
  readonly circumference = 2 * Math.PI * RADIUS;
  readonly offset = computed(
    () => this.circumference * (1 - Math.max(0, Math.min(1, this.progress()))),
  );
}
