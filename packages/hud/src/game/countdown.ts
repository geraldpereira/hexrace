import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  input,
} from '@angular/core';

const DROP: Keyframe[] = [
  { transform: 'scale(1.6)', opacity: 0 },
  { transform: 'scale(1)', opacity: 1, offset: 0.2 },
  { opacity: 1, offset: 0.8 },
  { opacity: 0 },
];

/**
 * Three, two, one, go, full screen; nothing when `step` is null. Each step replays the drop as a
 * Web Animation from an effect run after render, once the element exists (functional spec 7.5).
 * The sound is the audio module's business.
 */
@Component({
  selector: 'hr-countdown',
  template: `
    @if (step() !== null) {
      <div class="step" [class.go]="step() === 0">{{ text() }}</div>
    }
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      display: grid;
      place-items: center;
      pointer-events: none;
    }
    .step {
      font-size: 22vh;
      font-weight: 800;
      line-height: 1;
      color: var(--hr-text, #e8edf2);
      text-shadow: 0 0 2vh var(--hr-glass, rgba(0, 0, 0, 0.6));
    }
    .step.go {
      color: var(--hr-ok, #4cd964);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Countdown {
  /** 3, 2, 1, then 0 for go; null shows nothing. */
  readonly step = input.required<number | null>();
  readonly text = computed(() => (this.step() === 0 ? 'GO' : String(this.step())));

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    afterRenderEffect(() => {
      if (this.step() === null) return;
      this.element.nativeElement.querySelector('.step')?.animate?.(DROP, {
        duration: 900,
        easing: 'ease-out',
        fill: 'forwards',
      });
    });
  }
}
