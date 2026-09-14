import { type CurvePoint } from '@hud/debug/curve-point';

/** Where the plot sits inside the canvas, and how data maps to pixels. */
export class CurveLayout {
  static readonly MARGIN_L = 28;
  static readonly MARGIN_R = 8;
  static readonly MARGIN_T = 6;
  static readonly MARGIN_B = 16;

  width = 0;
  height = 0;
  xMin = 0;
  xMax = 1;
  yMin = 0;
  yMax = 1;

  static of(
    width: number,
    height: number,
    xRange: [number, number],
    yRange: [number, number],
  ): CurveLayout {
    const layout = new CurveLayout();
    layout.width = width;
    layout.height = height;
    [layout.xMin, layout.xMax] = xRange;
    [layout.yMin, layout.yMax] = yRange;
    return layout;
  }

  get plotW(): number {
    return this.width - CurveLayout.MARGIN_L - CurveLayout.MARGIN_R;
  }

  get plotH(): number {
    return this.height - CurveLayout.MARGIN_T - CurveLayout.MARGIN_B;
  }

  xToPx(x: number): number {
    return CurveLayout.MARGIN_L + ((x - this.xMin) / (this.xMax - this.xMin)) * this.plotW;
  }

  yToPx(y: number): number {
    return CurveLayout.MARGIN_T + (1 - (y - this.yMin) / (this.yMax - this.yMin)) * this.plotH;
  }

  /** Pixel to data, clamped to the ranges. */
  pxToData(px: number, py: number): CurvePoint {
    const x = this.xMin + ((px - CurveLayout.MARGIN_L) / this.plotW) * (this.xMax - this.xMin);
    const y = this.yMin + (1 - (py - CurveLayout.MARGIN_T) / this.plotH) * (this.yMax - this.yMin);
    return {
      x: Math.max(this.xMin, Math.min(this.xMax, x)),
      y: Math.max(this.yMin, Math.min(this.yMax, y)),
    };
  }
}

/** Grid, axes, labels, the polyline and its points; `lit` is the point under the pointer. */
export function paintCurve(
  ctx: CanvasRenderingContext2D,
  layout: CurveLayout,
  points: readonly CurvePoint[],
  lit: number | null,
): void {
  paintFrame(ctx, layout);
  ctx.strokeStyle = '#ffaa00';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  points.forEach((p, i) => {
    if (i === 0) ctx.moveTo(layout.xToPx(p.x), layout.yToPx(p.y));
    else ctx.lineTo(layout.xToPx(p.x), layout.yToPx(p.y));
  });
  ctx.stroke();

  points.forEach((p, i) => {
    ctx.fillStyle = i === lit ? '#ffd766' : '#ffaa00';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(layout.xToPx(p.x), layout.yToPx(p.y), i === lit ? 5 : 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
}

function paintFrame(ctx: CanvasRenderingContext2D, layout: CurveLayout): void {
  const { width: w, height: h } = layout;
  const { MARGIN_L: l, MARGIN_R: r, MARGIN_T: t, MARGIN_B: b } = CurveLayout;
  ctx.fillStyle = '#1c1c1c';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#2c2c2c';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < 4; i++) {
    const x = l + (layout.plotW * i) / 4;
    ctx.moveTo(x, t);
    ctx.lineTo(x, h - b);
  }
  for (let i = 1; i < 3; i++) {
    const y = t + (layout.plotH * i) / 3;
    ctx.moveTo(l, y);
    ctx.lineTo(w - r, y);
  }
  ctx.stroke();

  ctx.strokeStyle = '#555';
  ctx.beginPath();
  ctx.moveTo(l, t);
  ctx.lineTo(l, h - b);
  ctx.lineTo(w - r, h - b);
  ctx.stroke();

  ctx.fillStyle = '#888';
  ctx.font = '10px monospace';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'right';
  ctx.fillText(layout.yMax.toFixed(1), l - 3, t + 2);
  ctx.fillText(layout.yMin.toFixed(1), l - 3, h - b - 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(layout.xMin.toFixed(2), l, h - b + 2);
  ctx.fillText(layout.xMax.toFixed(2), w - r, h - b + 2);
}
