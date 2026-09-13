import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  DebugPanel,
  addCurveEditor,
  addPlot,
  startFrameLoop,
  type CurvePoint,
  type DebugFolder,
} from '@hexrace/hud';

/** The object the demo folder tunes: a value every kind of control can act on. */
export class DemoSubject {
  speed = 40;
  enabled = true;
  colour = 'var(--hr-accent, #ffaa00)';
  mode: 'sine' | 'square' | 'noise' = 'sine';
  label = 'demo';
  /** The curve maps the wave's phase (0..1) to an amplitude. */
  curve: CurvePoint[] = [
    { x: 0, y: 0.2 },
    { x: 0.5, y: 1 },
    { x: 1, y: 0.2 },
  ];
  /** Read-only: the wave's current value. */
  wave = 0;

  sample(seconds: number): number {
    if (!this.enabled) return 0;
    const phase = (seconds * this.speed) / 60;
    const amplitude = this.curveAt(phase % 1);
    if (this.mode === 'square') return Math.sign(Math.sin(phase * 2 * Math.PI)) * amplitude;
    // eslint-disable-next-line sonarjs/pseudo-random -- demo noise, nothing secure about it.
    if (this.mode === 'noise') return (Math.random() * 2 - 1) * amplitude;
    return Math.sin(phase * 2 * Math.PI) * amplitude;
  }

  curveAt(x: number): number {
    const points = this.curve;
    const first = points[0];
    const last = points.at(-1);
    if (!first || !last) return 0;
    if (x <= first.x) return first.y;
    if (x >= last.x) return last.y;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      if (a && b && x <= b.x) return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
    }
    return last.y;
  }
}

/**
 * The debug panel showcase: a demo object driven by one folder of every kind of control, a curve
 * editor and a live plot, so the panel proves itself before any game module leans on it. The page
 * itself only explains; the panel is lil-gui's own DOM, top right.
 */
@Component({
  selector: 'hr-debug-showcase',
  imports: [RouterLink],
  template: `
    <main>
      <header>
        <a routerLink="/lab">← lab</a>
        <h1>hud/debug</h1>
        <p>
          The lil-gui panel, top right. Press <kbd>\`</kbd> to hide or show it. Values persist
          across reloads; "Reset folder" forgets one folder, "Reset all" everything, "Copy values as
          JSON" puts the tuning in the clipboard for the code.
        </p>
      </header>
      <section>
        <p>
          Demo wave: <strong>{{ wave() }}</strong>
        </p>
        <p class="hint">
          Speed, enabled, colour, mode and label are the plain controls; the curve shapes the wave's
          amplitude over its phase; the plot below the curve follows the wave; the Performance
          folder reads the frame rate and can show it in the corner.
        </p>
      </section>
    </main>
  `,
  styles: `
    main {
      max-width: 40rem;
      margin: 0 auto;
      padding: 1.5rem 1rem;
    }
    header a {
      font-size: 0.9rem;
    }
    strong {
      font-variant-numeric: tabular-nums;
    }
    .hint {
      font-size: 0.85rem;
      opacity: 0.7;
    }
    kbd {
      padding: 0 0.3rem;
      border: 1px solid var(--hr-border, #4a5560);
      border-radius: 0.2rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DebugShowcase {
  readonly subject = new DemoSubject();
  readonly wave = signal('0.00');

  private readonly panel = inject(DebugPanel);

  constructor() {
    this.panel.register('Demo', (f) => this.buildFolder(f), inject(DestroyRef));
    this.panel.show();
    startFrameLoop((now) => {
      this.subject.wave = this.subject.sample(now / 1000);
      this.wave.set(this.subject.wave.toFixed(2));
    });
  }

  private buildFolder(folder: DebugFolder): void {
    const s = this.subject;
    folder.add(s, 'speed', 0, 120, 1).name('Speed (rpm)');
    folder.add(s, 'enabled').name('Enabled');
    folder.addColor(s, 'colour').name('Colour');
    folder.add(s, 'mode', ['sine', 'square', 'noise']).name('Mode');
    folder.add(s, 'label').name('Label');
    folder.add(s, 'wave', -1, 1, 0.01).name('Wave').listen().disable();
    addCurveEditor(folder, {
      xRange: [0, 1],
      yRange: [0, 1],
      xLabel: 'phase',
      yLabel: 'amplitude',
      initialPoints: s.curve,
      onChange: (points) => {
        s.curve = [...points];
      },
    });
    addPlot(folder, { label: 'wave', min: -1, max: 1, sample: () => s.wave });
  }
}
