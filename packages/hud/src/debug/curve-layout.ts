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
