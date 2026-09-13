import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

/** The warning when the car drives against the track (functional spec 7.5). */
@Component({
  selector: 'hr-wrong-way',
  imports: [MatIcon],
  template: `
    @if (active()) {
      <div class="banner" role="alert">
        <mat-icon aria-hidden="true">warning</mat-icon> wrong way
      </div>
    }
  `,
  styles: `
    .banner {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.3rem 0.8rem;
      border-radius: 0.4rem;
      background: #ff3b3b;
      color: #fff;
      font-weight: 700;
      text-transform: uppercase;
      animation: blink 0.8s steps(2, end) infinite;
    }
    @keyframes blink {
      to {
        opacity: 0.4;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WrongWay {
  readonly active = input.required<boolean>();
}
