import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** One characteristic of a car as a label and a share of the maximum. */
export interface Stat {
  readonly label: string;
  /** 0 to 1. */
  readonly value: number;
}

/** A car's characteristics as bars: top speed, acceleration, sturdiness... (functional spec 7.5). */
@Component({
  selector: 'hr-stat-bars',
  template: `
    <dl>
      @for (stat of stats(); track stat.label) {
        <dt>{{ stat.label }}</dt>
        <dd>
          <div class="track"><div class="fill" [style.width.%]="stat.value * 100"></div></div>
        </dd>
      }
    </dl>
  `,
  styles: `
    dl {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.3rem 0.8rem;
      align-items: center;
      margin: 0;
      font-size: 0.85rem;
    }
    dd {
      margin: 0;
    }
    .track {
      height: 0.5rem;
      border-radius: 0.25rem;
      background: rgba(255, 255, 255, 0.12);
      overflow: hidden;
    }
    .fill {
      height: 100%;
      background: #ffaa00;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatBars {
  readonly stats = input.required<readonly Stat[]>();
}
