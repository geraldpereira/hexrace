import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

/** Each assist: null when the car does not have it, else whether it is acting right now. */
export interface AssistReadout {
  readonly abs: boolean | null;
  readonly tractionControl: boolean | null;
}

/** One lamp per bought assist, lit while it works, like a dashboard (functional spec 7.5). */
@Component({
  selector: 'hr-assist-lamps',
  imports: [MatIcon],
  template: `
    @if (assists().abs !== null) {
      <mat-icon class="lamp" [class.on]="assists().abs" title="ABS" aria-label="ABS"
        >tire_repair</mat-icon
      >
    }
    @if (assists().tractionControl !== null) {
      <mat-icon
        class="lamp"
        [class.on]="assists().tractionControl"
        title="Traction control"
        aria-label="Traction control"
      >
        swap_driving_apps_wheel
      </mat-icon>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      gap: 0.4rem;
    }
    .lamp {
      width: 1.6rem;
      height: 1.6rem;
      font-size: 1.6rem;
      opacity: 0.3;
      transition: all 0.1s;
    }
    .lamp.on {
      opacity: 1;
      color: #ffaa00;
      filter: drop-shadow(0 0 4px #ffaa00);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssistLamps {
  readonly assists = input.required<AssistReadout>();
}
