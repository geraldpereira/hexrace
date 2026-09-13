import { DestroyRef, NgZone, inject } from '@angular/core';

/**
 * Runs `tick` on every animation frame, outside Angular's zone, until the caller is destroyed.
 * To be called from a constructor: it injects the zone and the caller's `DestroyRef`. The HUD's
 * stand-in for the engine loop wherever a display refreshes itself.
 */
export function startFrameLoop(tick: FrameRequestCallback): void {
  const zone = inject(NgZone);
  let frame = 0;
  const loop: FrameRequestCallback = (now) => {
    tick(now);
    frame = requestAnimationFrame(loop);
  };
  zone.runOutsideAngular(() => {
    frame = requestAnimationFrame(loop);
  });
  inject(DestroyRef).onDestroy(() => {
    cancelAnimationFrame(frame);
  });
}
