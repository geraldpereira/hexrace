import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

import { Credits } from '@hud/commons/credits';
import { StatBars, type Stat } from '@hud/commons/stat-bars';

/** A car as the garage shows it (functional spec 7.5). */
export interface CarSummary {
  readonly name: string;
  /** Null once owned. */
  readonly price: number | null;
  readonly locked: boolean;
  readonly transmission: 'FWD' | 'RWD' | 'AWD';
  readonly stats: readonly Stat[];
}

@Component({
  selector: 'hr-car-card',
  imports: [MatIcon, Credits, StatBars],
  template: `
    <article [class.locked]="car().locked">
      <div class="silhouette">
        <mat-icon aria-hidden="true">directions_car</mat-icon>
        @if (car().locked) {
          <mat-icon class="lock" aria-label="Locked">lock</mat-icon>
        }
      </div>
      <h3>{{ car().name }}</h3>
      <p class="meta">{{ car().transmission }}</p>
      <hr-stat-bars [stats]="car().stats" />
      <p class="price">
        @if (car().price; as price) {
          <hr-credits [amount]="price" />
        } @else {
          <span>{{ ownedText() }}</span>
        }
      </p>
    </article>
  `,
  styles: `
    article {
      width: 13rem;
      padding: 0.6rem;
      border-radius: 0.6rem;
      background: var(--hr-card, rgba(255, 255, 255, 0.06));
    }
    article.locked {
      opacity: 0.55;
    }
    .silhouette {
      position: relative;
      display: grid;
      place-items: center;
      height: 4.5rem;
      border-radius: 0.4rem;
      background: var(--hr-surface, #1e262f);
    }
    .silhouette > mat-icon {
      font-size: 3rem;
      width: 3rem;
      height: 3rem;
    }
    .silhouette > .lock {
      position: absolute;
      right: 0.3rem;
      top: 0.3rem;
      font-size: 1.2rem;
      width: 1.2rem;
      height: 1.2rem;
    }
    h3 {
      margin: 0.5rem 0 0.1rem;
      font-size: 1rem;
    }
    p {
      margin: 0.2rem 0;
      font-size: 0.8rem;
    }
    .price {
      margin-top: 0.5rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarCard {
  readonly car = input.required<CarSummary>();
  readonly ownedText = computed(() => (this.car().locked ? 'locked' : 'owned'));
}
