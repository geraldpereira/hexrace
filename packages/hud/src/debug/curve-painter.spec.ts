import { TestBed } from '@angular/core/testing';

import { fakeContext } from '@hud/debug/canvas.mock';
import { CurveLayout } from '@hud/debug/curve-layout';
import { CurvePainter } from '@hud/debug/curve-painter';

describe('CurvePainter', () => {
  it('draws the frame, the polyline and one lit point', () => {
    TestBed.configureTestingModule({});
    const { ctx, calls } = fakeContext();
    TestBed.inject(CurvePainter).paint(
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
