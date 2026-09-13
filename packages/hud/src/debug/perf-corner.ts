import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { startFrameLoop } from '@hud/debug/frame-loop';
import { PerfMeter } from '@hud/debug/perf-meter';

/**
 * Frames per second in the top-left corner, shown when the meter says so. Feeds the meter itself
 * every frame, so the reading stands even with the panel closed, and refreshes its text four
 * times a second so it can be read.
 */
@Component({
  selector: 'hr-perf-corner',
  template: `
    @if (meter.cornerVisible()) {
      <div class="corner">{{ text() }}</div>
    }
  `,
  styles: `
    .corner {
      position: fixed;
      top: 0;
      left: 0;
      z-index: 20;
      padding: 2px 6px;
      background: rgba(0, 0, 0, 0.6);
      color: #ffaa00;
      font: 12px/1.4 monospace;
      pointer-events: none;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerfCorner {
  readonly meter = inject(PerfMeter);
  readonly text = signal('');

  private nextRefresh = 0;

  constructor() {
    startFrameLoop((now) => {
      this.meter.frame(now);
      if (now < this.nextRefresh) return;
      this.nextRefresh = now + 250;
      const step = this.meter.stepMs > 0 ? ` · step ${this.meter.stepMs.toFixed(1)} ms` : '';
      this.text.set(`${this.meter.fps.toFixed(0)} fps${step}`);
    });
  }
}
