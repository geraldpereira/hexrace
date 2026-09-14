import { TestBed } from '@angular/core/testing';

import { Grain } from '@car/drive/grain';
import { FIRM } from '@car/entity/surfaces/sealed-feels';
import { SOFT } from '@car/entity/surfaces/loose-feels';

describe('Grain', () => {
  let grain: Grain;

  beforeEach(() => {
    grain = TestBed.inject(Grain);
  });

  it('gives no bump and no side force on a smooth surface', () => {
    expect(grain.bump(FIRM, 12, 0)).toBeCloseTo(0);
    expect(grain.lateral(FIRM, 12, 0, 3000, 20)).toBeCloseTo(0);
  });

  it('bumps within the surface height and differs from wheel to wheel', () => {
    const front = grain.bump(SOFT, 25, 0);
    const back = grain.bump(SOFT, 25, 2);
    expect(Math.abs(front)).toBeLessThanOrEqual(SOFT.bumpHeight);
    expect(front).not.toBe(back);
  });

  it('holds the same bump while the car does not move, and changes as it travels', () => {
    expect(grain.bump(SOFT, 10, 1)).toBe(grain.bump(SOFT, 10, 1));
    expect(grain.bump(SOFT, 10, 1)).not.toBe(grain.bump(SOFT, 13, 1));
  });

  it('scales the side force with speed and caps it at twice the reference', () => {
    const slow = Math.abs(grain.lateral(SOFT, 40, 1, 3000, 5));
    const fast = Math.abs(grain.lateral(SOFT, 40, 1, 3000, 20));
    const faster = Math.abs(grain.lateral(SOFT, 40, 1, 3000, 60));
    expect(fast).toBeGreaterThan(slow);
    expect(faster).toBeCloseTo(fast);
  });
});
