import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Each assist: null when the car does not have it, else whether it is acting right now. */
export interface AssistReadout {
  readonly abs: boolean | null;
  readonly tractionControl: boolean | null;
}

/** One lamp per bought assist, lit while it works, like a dashboard (functional spec 7.5). */
@Component({
  selector: 'hr-assist-lamps',
  template: `
    @if (assists().abs !== null) {
      <span class="lamp" [class.on]="assists().abs">ABS</span>
    }
    @if (assists().tractionControl !== null) {
      <span class="lamp" [class.on]="assists().tractionControl">TC</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      gap: 0.4rem;
    }
    .lamp {
      padding: 0.1rem 0.4rem;
      border-radius: 0.3rem;
      border: 1px solid rgba(255, 255, 255, 0.25);
      font-size: 0.75rem;
      font-weight: 700;
      opacity: 0.35;
      transition: all 0.1s;
    }
    .lamp.on {
      opacity: 1;
      background: #ffaa00;
      color: #111;
      border-color: #ffaa00;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssistLamps {
  readonly assists = input.required<AssistReadout>();
}
