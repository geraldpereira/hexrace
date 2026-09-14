import { Injectable } from '@angular/core';

import { CurveLayout } from '@hud/debug/curve-layout';
import { type CurvePoint } from '@hud/debug/curve-point';

/** Paints a curve editor's canvas: grid, axes, labels, the polyline and its points. */
@Injectable({ providedIn: 'root' })
export class CurvePainter {
  /** `lit` is the index of the point under the pointer, drawn larger. */
  paint(
    ctx: CanvasRenderingContext2D,
    layout: CurveLayout,
    points: readonly CurvePoint[],
    lit: number | null,
  ): void {
    this.frame(ctx, layout);
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

  private frame(ctx: CanvasRenderingContext2D, layout: CurveLayout): void {
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
}
