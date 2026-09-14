import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  input,
} from '@angular/core';

const FLASH: Keyframe[] = [{ color: '#ffaa00', transform: 'scale(1.25)' }, {}];

/**
 * The gear, big: R, N or 1 to 9, with a flash on every change and a dot when the manual box would
 * like a shift up. The flash is a Web Animation replayed from an effect run after render, so the
 * element stays and exists when the effect looks for it.
 */
@Component({
  selector: 'hr-gear-indicator',
  template: `
    <span class="gear">{{ text() }}</span>
    @if (shiftHint()) {
      <span class="hint" aria-label="Shift up"></span>
    }
  `,
  styles: `
    :host {
      position: relative;
      display: inline-block;
      font-variant-numeric: tabular-nums;
    }
    .gear {
      font-size: 3rem;
      line-height: 1;
      font-weight: 700;
      min-width: 1.2em;
      text-align: center;
    }
    .hint {
      position: absolute;
      top: 0.2rem;
      right: -0.6rem;
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
      background: var(--hr-accent, #ffaa00);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GearIndicator {
  /** Negative is reverse, 0 neutral, 1 and up forward. */
  readonly gear = input.required<number>();
  readonly shiftHint = input(false);
  readonly text = computed(() => this.gearText(this.gear()));

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    afterRenderEffect(() => {
      this.gear();
      const gear = this.element.nativeElement.querySelector('.gear');
      gear?.animate?.(FLASH, { duration: 250, easing: 'ease-out' });
    });
  }

  private gearText(gear: number): string {
    if (gear < 0) return 'R';
    if (gear === 0) return 'N';
    return String(gear);
  }
}
