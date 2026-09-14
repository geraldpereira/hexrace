import { EnvironmentInjector, inject, runInInjectionContext } from '@angular/core';

import { CurveLayout } from '@hud/debug/curve-layout';
import { CurvePainter } from '@hud/debug/curve-painter';
import { type CurvePoint } from '@hud/debug/curve-point';
import { CurveWidgets } from '@hud/debug/curve-widgets';

export { type CurvePoint } from '@hud/debug/curve-point';

export interface CurveEditorOptions {
  width?: number;
  height?: number;
  xRange: [number, number];
  yRange: [number, number];
  xLabel?: string;
  yLabel?: string;
  initialPoints: readonly CurvePoint[];
  onChange: (points: readonly CurvePoint[]) => void;
  /** An `expand` button opening a full-screen copy; default true. */
  expandable?: boolean;
}

const OVERLAY_W = 720;
const OVERLAY_H = 460;
const DEFAULT_W = 240;
const DEFAULT_H = 120;
const HIT_RADIUS = 8;

/**
 * A piecewise-linear curve the developer shapes by hand: drag a point, double-click to add one,
 * shift-click or right-click to remove one, `expand` for a full-screen copy. Points stay ordered
 * along X. Every change calls `onChange`; the host mounts `element`. Drawing is skipped where
 * there is no 2D context. Built by `CurveEditors` inside the injection context, for `inject()`.
 */
export class CurveEditor {
  readonly element: HTMLDivElement;

  private readonly widgets = inject(CurveWidgets);
  private readonly painter = inject(CurvePainter);
  private readonly injector = inject(EnvironmentInjector);
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly layout: CurveLayout;
  private readonly initial: CurvePoint[];
  private readonly onChange: (points: readonly CurvePoint[]) => void;
  private readonly title: string;
  private points: CurvePoint[];
  private dragging: CurvePoint | null = null;
  private hover: CurvePoint | null = null;
  private overlay: (() => void) | null = null;

  // eslint-disable-next-line no-restricted-syntax -- a DOM widget built from its options, not a service: there is nothing to inject.
  constructor(private readonly opts: CurveEditorOptions) {
    this.layout = CurveLayout.of(
      opts.width ?? DEFAULT_W,
      opts.height ?? DEFAULT_H,
      opts.xRange,
      opts.yRange,
    );
    this.initial = opts.initialPoints.map((p) => ({ ...p }));
    this.points = opts.initialPoints.map((p) => ({ ...p }));
    this.onChange = opts.onChange;
    this.title = `${opts.xLabel ?? 'x'} → ${opts.yLabel ?? 'y'}`;

    this.element = document.createElement('div');
    this.element.style.cssText = 'display:flex;flex-direction:column;gap:2px;padding:4px 0;';
    const expand = opts.expandable === false ? null : () => this.openOverlay();
    this.element.appendChild(this.widgets.header(this.title, expand, () => this.reset()));
    const built = this.widgets.canvas(this.layout.width, this.layout.height);
    this.canvas = built.canvas;
    this.ctx = built.ctx;
    this.element.appendChild(this.canvas);
    this.listen();
    this.draw();
  }

  getPoints(): readonly CurvePoint[] {
    return this.points;
  }

  setPoints(points: readonly CurvePoint[]): void {
    this.commit(points.map((p) => ({ ...p })));
  }

  private reset(): void {
    this.commit(this.initial.map((p) => ({ ...p })));
  }

  private commit(points: CurvePoint[]): void {
    this.points = points;
    this.draw();
    this.onChange(this.points);
  }

  private listen(): void {
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerUp);
    this.canvas.addEventListener('dblclick', this.onDoubleClick);
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }

  private openOverlay(): void {
    if (this.overlay) return;
    const root = document.createElement('div');
    root.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;';
    const panel = document.createElement('div');
    panel.style.cssText =
      'background:#1a1a1a;padding:18px;border:1px solid #444;color:#ddd;font-family:system-ui,sans-serif;';
    const editor = runInInjectionContext(
      this.injector,
      () =>
        new CurveEditor({
          ...this.opts,
          width: OVERLAY_W,
          height: OVERLAY_H,
          initialPoints: this.initial,
          expandable: false,
          onChange: (pts: readonly CurvePoint[]) =>
            this.commit(pts.map((p: CurvePoint) => ({ ...p }))),
        }),
    );
    editor.setPoints(this.points);
    panel.appendChild(editor.element);
    const footer = document.createElement('div');
    footer.style.cssText = 'display:flex;justify-content:flex-end;margin-top:10px;';
    const close = document.createElement('button');
    close.textContent = 'close';
    close.style.cssText =
      'font-size:12px;padding:4px 14px;background:#2c2c2c;color:#ddd;border:1px solid #444;cursor:pointer;';
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') closeOverlay();
    };
    const closeOverlay = (): void => {
      root.remove();
      window.removeEventListener('keydown', onKey);
      this.overlay = null;
    };
    close.addEventListener('click', closeOverlay);
    footer.appendChild(close);
    panel.appendChild(footer);
    root.appendChild(panel);
    document.body.appendChild(root);
    window.addEventListener('keydown', onKey);
    root.addEventListener('click', (e) => {
      if (e.target === root) closeOverlay();
    });
    this.overlay = closeOverlay;
  }

  private pickPoint(px: number, py: number): CurvePoint | null {
    return (
      this.points.find((p) => {
        const dx = this.layout.xToPx(p.x) - px;
        const dy = this.layout.yToPx(p.y) - py;
        return dx * dx + dy * dy <= HIT_RADIUS * HIT_RADIUS;
      }) ?? null
    );
  }

  private local(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private readonly onPointerDown = (e: PointerEvent): void => {
    const { x, y } = this.local(e);
    const point = this.pickPoint(x, y);
    if (point === null) return;
    if (e.shiftKey || e.button === 2) {
      if (this.points.length > 2) this.commit(this.points.filter((p) => p !== point));
      return;
    }
    this.dragging = point;
    this.canvas.setPointerCapture(e.pointerId);
  };

  private readonly onPointerMove = (e: PointerEvent): void => {
    const { x, y } = this.local(e);
    if (this.dragging === null) {
      const hover = this.pickPoint(x, y);
      if (hover !== this.hover) {
        this.hover = hover;
        this.draw();
      }
      return;
    }
    const target = this.layout.pxToData(x, y);
    const point = this.dragging;
    const index = this.points.indexOf(point);
    const minX = this.points[index - 1]?.x ?? this.layout.xMin;
    const maxX = this.points[index + 1]?.x ?? this.layout.xMax;
    point.x = Math.max(minX, Math.min(maxX, target.x));
    point.y = target.y;
    this.commit(this.points);
  };

  private readonly onPointerUp = (e: PointerEvent): void => {
    if (this.dragging === null) return;
    this.dragging = null;
    try {
      this.canvas.releasePointerCapture(e.pointerId);
    } catch {
      // Nothing captured, nothing to release.
    }
  };

  private readonly onDoubleClick = (e: MouseEvent): void => {
    const { x, y } = this.local(e);
    const data = this.layout.pxToData(x, y);
    const after = this.points.findIndex((p) => p.x > data.x);
    const at = after === -1 ? this.points.length : after;
    this.commit([...this.points.slice(0, at), data, ...this.points.slice(at)]);
  };

  private draw(): void {
    if (!this.ctx) return;
    const lit = this.dragging ?? this.hover;
    this.painter.paint(this.ctx, this.layout, this.points, lit ? this.points.indexOf(lit) : null);
  }
}
