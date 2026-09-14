import { DestroyRef, Injectable, NgZone, inject } from '@angular/core';

/**
 * Runs a tick on every animation frame, outside Angular's zone, until the caller is destroyed.
 * `start` is called from a constructor: it reads the caller's `DestroyRef` from the injection
 * context it runs in. The HUD's stand-in for the engine loop wherever a display refreshes itself.
 */
@Injectable({ providedIn: 'root' })
export class FrameLoop {
  private readonly zone = inject(NgZone);

  start(tick: FrameRequestCallback): void {
    let frame = 0;
    const loop: FrameRequestCallback = (now) => {
      tick(now);
      frame = requestAnimationFrame(loop);
    };
    this.zone.runOutsideAngular(() => {
      frame = requestAnimationFrame(loop);
    });
    inject(DestroyRef).onDestroy(() => {
      cancelAnimationFrame(frame);
    });
  }
}
