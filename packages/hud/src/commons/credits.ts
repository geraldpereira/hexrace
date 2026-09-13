import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

/** The player's balance, always the same shape wherever it shows (functional spec 7.5). */
@Component({
  selector: 'hr-credits',
  imports: [MatIcon],
  template: `<mat-icon aria-hidden="true">paid</mat-icon><span>{{ text() }}</span>`,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      font-variant-numeric: tabular-nums;
      font-weight: 600;
    }
    mat-icon {
      color: #ffaa00;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Credits {
  readonly amount = input.required<number>();
  readonly text = computed(() => new Intl.NumberFormat('en').format(this.amount()));
}
