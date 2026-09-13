import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

/** The frame's inner size in CSS pixels. */
export interface FrameSize {
  readonly width: number;
  readonly height: number;
}

/**
 * The frame the 3D rendering lives in: one canvas for the whole application, moved from screen to
 * screen (functional spec 7.5). The frame takes the canvas as an input, adopts it as its only child
 * and reports its own size in CSS pixels through `size` and `resized`, so the renderer resizes to
 * whatever box the screen gives it: full screen behind the race, a tile beside the garage's settings.
 */
@Component({
  selector: 'hr-canvas-frame',
  template: '',
  styles: `
    :host {
      display: block;
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    :host > canvas {
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
  readonly size = signal<FrameSize>({ width: 0, height: 0 });
  readonly resized = output<FrameSize>();

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    effect(() => {
      this.element.nativeElement.replaceChildren(this.canvas());
    });
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (!box) return;
      const size = { width: Math.round(box.width), height: Math.round(box.height) };
      this.size.set(size);
      this.resized.emit(size);
    });
    observer.observe(this.element.nativeElement);
    inject(DestroyRef).onDestroy(() => {
      observer.disconnect();
    });
  }
}
