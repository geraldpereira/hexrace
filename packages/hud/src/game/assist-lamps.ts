import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Each assist: null when the car does not have it, else whether it is acting right now. */
export interface AssistReadout {
  readonly abs: boolean | null;
  readonly tractionControl: boolean | null;
}

/**
 * One lamp per bought assist, lit while it works, drawn like a dashboard's (functional spec 7.5):
 * ABS is the word in a circle between two brake shoes, traction control the standard lamp: a car seen
 * from behind over two S-shaped skid marks.
 */
@Component({
  selector: 'hr-assist-lamps',
  template: `
    @if (assists().abs !== null) {
      <svg class="lamp" [class.on]="assists().abs" viewBox="0 0 32 32" role="img" aria-label="ABS">
        <title>ABS</title>
        <path d="M6 7 A13 13 0 0 0 6 25" />
        <path d="M26 7 A13 13 0 0 1 26 25" />
        <circle cx="16" cy="16" r="8.5" />
        <text x="16" y="18.6">ABS</text>
      </svg>
    }
    @if (assists().tractionControl !== null) {
      <svg
        class="lamp"
        [class.on]="assists().tractionControl"
        viewBox="0 0 32 32"
        role="img"
        aria-label="Traction control"
      >
        <title>Traction control</title>
        <path d="M11.5 3 h9 l2.5 5 h-14 z" />
        <rect x="6.5" y="8" width="19" height="9" rx="1.5" />
        <path d="M6.5 9.5 H4.5 M25.5 9.5 H27.5 M9.5 12.5 h4 M18.5 12.5 h4" />
        <path class="wheel" d="M8 17 h3.5 v3 H8 z M20.5 17 H24 v3 h-3.5 z" />
        <path class="skid" d="M10.5 22 c-3 1.6 3 3 0 4.6 s-3 2.2 -0.5 4.4" />
        <path class="skid" d="M21.5 22 c-3 1.6 3 3 0 4.6 s-3 2.2 -0.5 4.4" />
      </svg>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      gap: 0.4rem;
    }
    .lamp {
      width: 1.8rem;
      height: 1.8rem;
      opacity: 0.3;
      transition: all 0.1s;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .lamp text {
      fill: currentColor;
      stroke: none;
      font:
        700 7px system-ui,
        sans-serif;
      text-anchor: middle;
    }
    .lamp .wheel {
      fill: currentColor;
      stroke: none;
    }
    .lamp .skid {
      stroke-width: 2.6;
    }
    .lamp.on {
      opacity: 1;
      color: var(--hr-accent, #ffaa00);
      filter: drop-shadow(0 0 4px var(--hr-accent, #ffaa00));
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssistLamps {
  readonly assists = input.required<AssistReadout>();
}
