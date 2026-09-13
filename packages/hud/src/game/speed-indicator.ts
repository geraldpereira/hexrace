import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** The speed in km/h only, tabular digits so they do not jump (functional spec 7.5). */
@Component({
  selector: 'hr-speed-indicator',
  template: `<span class="value">{{ text() }}</span
    ><span class="unit">km/h</span>`,
  styles: `
    :host {
      display: inline-flex;
      align-items: baseline;
      gap: 0.3rem;
      font-variant-numeric: tabular-nums;
    }
    .value {
      font-size: 2.2rem;
      font-weight: 600;
      line-height: 1;
      min-width: 2.2em;
      text-align: right;
    }
    .unit {
      font-size: 0.8rem;
      opacity: 0.7;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpeedIndicator {
  readonly kmh = input.required<number>();
  readonly text = computed(() => String(Math.max(0, Math.round(this.kmh()))));
}
