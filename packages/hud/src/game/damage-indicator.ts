import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  input,
} from '@angular/core';

import { type DamagePart, type DamageReadout } from '@hud/game/damage-readout';

const PULSE: Keyframe[] = [{ fill: '#fff', stroke: '#fff' }, {}];

/**
 * The car seen from above, each part its own shape coloured by its state, green through amber to
 * red; the part that just took a hit pulses once, a Web Animation replayed from an effect. Front
 * is up. Functional spec 7.5.
 */
@Component({
  selector: 'hr-damage-indicator',
  template: `
    <svg viewBox="0 0 60 100" role="img" aria-label="Damage">
      <rect
        class="part"
        data-part="chassis"
        x="15"
        y="8"
        width="30"
        height="84"
        rx="9"
        [attr.fill]="colour('chassis')"
      />
      <rect
        class="part"
        data-part="engine"
        x="20"
        y="13"
        width="20"
        height="16"
        rx="3"
        [attr.fill]="colour('engine')"
      />
      <rect
        class="part"
        data-part="steering"
        x="24"
        y="33"
        width="12"
        height="10"
        rx="2"
        [attr.fill]="colour('steering')"
      />
      <rect
        class="part"
        data-part="gearbox"
        x="24"
        y="56"
        width="12"
        height="18"
        rx="3"
        [attr.fill]="colour('gearbox')"
      />
      <rect
        class="part"
        data-part="suspensionFL"
        x="10"
        y="24"
        width="6"
        height="6"
        [attr.fill]="colour('suspensionFL')"
      />
      <rect
        class="part"
        data-part="suspensionFR"
        x="44"
        y="24"
        width="6"
        height="6"
        [attr.fill]="colour('suspensionFR')"
      />
      <rect
        class="part"
        data-part="suspensionRL"
        x="10"
        y="70"
        width="6"
        height="6"
        [attr.fill]="colour('suspensionRL')"
      />
      <rect
        class="part"
        data-part="suspensionRR"
        x="44"
        y="70"
        width="6"
        height="6"
        [attr.fill]="colour('suspensionRR')"
      />
      <rect
        class="part"
        data-part="wheelFL"
        x="2"
        y="18"
        width="8"
        height="18"
        rx="2"
        [attr.fill]="colour('wheelFL')"
      />
      <rect
        class="part"
        data-part="wheelFR"
        x="50"
        y="18"
        width="8"
        height="18"
        rx="2"
        [attr.fill]="colour('wheelFR')"
      />
      <rect
        class="part"
        data-part="wheelRL"
        x="2"
        y="64"
        width="8"
        height="18"
        rx="2"
        [attr.fill]="colour('wheelRL')"
      />
      <rect
        class="part"
        data-part="wheelRR"
        x="50"
        y="64"
        width="8"
        height="18"
        rx="2"
        [attr.fill]="colour('wheelRR')"
      />
    </svg>
  `,
  styles: `
    :host {
      display: block;
      width: 3.6rem;
    }
    svg {
      width: 100%;
      display: block;
    }
    .part {
      stroke: rgba(0, 0, 0, 0.5);
      stroke-width: 0.8;
      transition: fill 0.3s;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DamageIndicator {
  readonly damage = input.required<DamageReadout>();
  /** The part that just took a hit, or null; a new value replays the pulse. */
  readonly hit = input<DamagePart | null>(null);

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    effect(() => {
      const part = this.hit();
      if (part === null) return;
      const shape = this.element.nativeElement.querySelector<SVGElement>(`[data-part="${part}"]`);
      shape?.animate?.(PULSE, { duration: 500, easing: 'ease-out' });
    });
  }

  /** Green at 100, amber halfway, red at 0. */
  colour(part: DamagePart): string {
    const state = Math.max(0, Math.min(100, this.damage()[part]));
    return `hsl(${String(Math.round(state * 1.2))} 80% 45%)`;
  }
}
