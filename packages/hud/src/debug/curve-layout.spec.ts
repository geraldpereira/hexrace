import { fakeContext } from '@hud/debug/canvas.mock';
import { CurveLayout, paintCurve } from '@hud/debug/curve-layout';

describe('CurveLayout', () => {
  const layout = CurveLayout.of(240, 120, [0, 1], [0, 2]);

  it('maps data to pixels inside the margins and back', () => {
    expect(layout.xToPx(0)).toBe(CurveLayout.MARGIN_L);
    expect(layout.xToPx(1)).toBe(240 - CurveLayout.MARGIN_R);
    expect(layout.yToPx(2)).toBe(CurveLayout.MARGIN_T);
    expect(layout.yToPx(0)).toBe(120 - CurveLayout.MARGIN_B);
    const back = layout.pxToData(layout.xToPx(0.3), layout.yToPx(1.5));
    expect(back.x).toBeCloseTo(0.3, 6);
    expect(back.y).toBeCloseTo(1.5, 6);
  });

  it('clamps a pixel outside the plot to the ranges', () => {
    expect(layout.pxToData(-100, -100)).toEqual({ x: 0, y: 2 });
    expect(layout.pxToData(1000, 1000)).toEqual({ x: 1, y: 0 });
  });
});

describe('paintCurve', () => {
  it('draws the frame, the polyline and one lit point', () => {
    const { ctx, calls } = fakeContext();
    paintCurve(
      ctx,
      CurveLayout.of(240, 120, [0, 1], [0, 1]),
      [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
      1,
    );
    expect(calls.filter((c) => c.startsWith('fillText')).length).toBe(4);
    expect(calls.filter((c) => c.startsWith('arc')).length).toBe(2);
    expect(
      calls.some((c) => c.startsWith('arc(') && c.endsWith(',5,0,' + String(Math.PI * 2) + ')')),
    ).toBe(true);
    expect(calls.filter((c) => c === 'stroke()').length).toBe(5);
  });
});
