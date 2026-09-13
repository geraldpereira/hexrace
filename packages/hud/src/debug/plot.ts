import { type GUI } from 'lil-gui';

export interface PlotOptions {
  label: string;
  min: number;
  max: number;
  /** How many seconds the plot shows before scrolling. */
  seconds?: number;
  /** Read once per frame while the plot is on the page. */
  sample: () => number;
}

const WIDTH = 240;
const HEIGHT = 80;
const SECONDS = 5;

/**
 * A rolling plot of one value against time, mounted as a row in a lil-gui folder: fps, an engine's
 * revs, a wheel's slip. It samples on its own animation frame and stops the day its canvas leaves
 * the page, so a destroyed folder costs nothing. Drawing is skipped where there is no 2D context.
 */
export class DebugPlot {
  readonly element: HTMLDivElement;
  readonly values: number[] = [];

  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly capacity: number;
  private last = 0;
  private stopped = false;

  // eslint-disable-next-line no-restricted-syntax -- a DOM widget built from its options, not a service: there is nothing to inject.
  constructor(private readonly options: PlotOptions) {
    this.capacity = Math.round((options.seconds ?? SECONDS) * 60);
    this.element = document.createElement('div');
    this.element.style.cssText = 'display:flex;flex-direction:column;gap:2px;padding:4px 0;';
    const title = document.createElement('span');
    title.textContent = options.label;
    title.style.cssText = 'font-size:11px;opacity:0.7;';
    this.element.appendChild(title);
    this.canvas = document.createElement('canvas');
    this.canvas.width = WIDTH;
    this.canvas.height = HEIGHT;
    this.canvas.style.cssText = `width:${String(WIDTH)}px;height:${String(HEIGHT)}px;background:#1c1c1c;border:1px solid #333;display:block;`;
    this.element.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    requestAnimationFrame(this.tick);
  }

  /** Adds one sample and redraws; the loop calls it, a test may too. */
  push(value: number): void {
    this.values.push(value);
    if (this.values.length > this.capacity) this.values.shift();
    this.draw(value);
  }

  stop(): void {
    this.stopped = true;
  }

  private readonly tick = (now: number): void => {
    if (this.stopped) return;
    if (this.element.isConnected || this.last === 0) {
      this.last = now;
      this.push(this.options.sample());
    } else if (now - this.last > 1000) {
      this.stopped = true;
      return;
    }
    requestAnimationFrame(this.tick);
  };

  private draw(latest: number): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const { min, max } = this.options;
    ctx.fillStyle = '#1c1c1c';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.strokeStyle = '#2c2c2c';
    ctx.beginPath();
    for (let i = 1; i < 4; i++) {
      ctx.moveTo(0, (HEIGHT * i) / 4);
      ctx.lineTo(WIDTH, (HEIGHT * i) / 4);
    }
    ctx.stroke();
    ctx.strokeStyle = '#ffaa00';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const step = WIDTH / this.capacity;
    const x0 = WIDTH - this.values.length * step;
    this.values.forEach((v, i) => {
      const y = HEIGHT - ((v - min) / (max - min)) * HEIGHT;
      if (i === 0) ctx.moveTo(x0, y);
      else ctx.lineTo(x0 + i * step, y);
    });
    ctx.stroke();
    ctx.fillStyle = '#ddd';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(latest.toFixed(1), WIDTH - 4, 3);
  }
}

/** Mounts a plot as a row of a lil-gui folder. */
export function addPlot(folder: GUI, options: PlotOptions): DebugPlot {
  const plot = new DebugPlot(options);
  folder.$children.appendChild(plot.element);
  return plot;
}
