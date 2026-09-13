import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';

/**
 * The frame the 3D rendering lives in: one canvas for the whole application, moved from screen to
 * screen (functional spec 7.5). The frame takes the canvas as an input, adopts it as its child and
 * reports its own size in CSS pixels through `size`, so the renderer resizes to whatever box the
 * screen gives it: full screen behind the race, a tile beside the garage's settings.
 */
@Component({
  selector: 'hr-canvas-frame',
  template: '<div #host class="host"></div>',
  styles: `
    :host {
      display: block;
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    .host,
    .host > canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CanvasFrame {
  readonly canvas = input.required<HTMLCanvasElement>();
  readonly size = signal({ width: 0, height: 0 });

  private readonly host = viewChild.required<ElementRef<HTMLDivElement>>('host');
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    effect(() => {
      this.host().nativeElement.replaceChildren(this.canvas());
    });
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (box) this.size.set({ width: Math.round(box.width), height: Math.round(box.height) });
    });
    observer.observe(this.element.nativeElement);
    inject(DestroyRef).onDestroy(() => {
      observer.disconnect();
    });
  }
}
