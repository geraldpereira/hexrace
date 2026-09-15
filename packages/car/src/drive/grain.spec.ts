import { TestBed } from '@angular/core/testing';

import { Grain } from '@car/drive/grain';
import { FIRM } from '@car/entity/surfaces/sealed-feels';
import { SOFT } from '@car/entity/surfaces/loose-feels';
import { SWELL_CATALOG } from '@car/entity/surfaces/swell-catalog';

const FLAT = SWELL_CATALOG.europe.road[0];
const ROUGH = SWELL_CATALOG.europe.landscape[1];

describe('Grain', () => {
  let grain: Grain;

  beforeEach(() => {
    grain = TestBed.inject(Grain);
  });

  it('gives no bump and no side force on a smooth surface of a flat ground', () => {
    expect(grain.bump(FIRM, FLAT, 12, 4)).toBeCloseTo(0);
    expect(grain.lateral(FIRM, 12, 4, 3000, 20)).toBeCloseTo(0);
  });

  it('bumps within the surface height and differs from place to place', () => {
    const here = grain.bump(SOFT, FLAT, 25, 3);
    const there = grain.bump(SOFT, FLAT, 25, 9);
    expect(Math.abs(here)).toBeLessThanOrEqual(SOFT.bumpHeight);
    expect(here).not.toBe(there);
  });

  it('gives the same bump at the same place, whatever the way in', () => {
    expect(grain.bump(SOFT, FLAT, 10, 2)).toBe(grain.bump(SOFT, FLAT, 10, 2));
    expect(grain.bump(SOFT, FLAT, 10, 2)).not.toBe(grain.bump(SOFT, FLAT, 13, 2));
  });

  it('adds the swell to the grain, and reads it alone the same way', () => {
    const alone = grain.swell(ROUGH, 30, 12);
    expect(Math.abs(alone)).toBeLessThanOrEqual(ROUGH.height);
    expect(grain.bump(SOFT, ROUGH, 30, 12)).toBeCloseTo(alone + grain.bump(SOFT, FLAT, 30, 12));
    expect(grain.swell({ height: 0.1, length: 0 }, 30, 12)).toBe(0);
  });

  it('scales the side force with speed and caps it at twice the reference', () => {
    const slow = Math.abs(grain.lateral(SOFT, 40, 7, 3000, 5));
    const fast = Math.abs(grain.lateral(SOFT, 40, 7, 3000, 20));
    const faster = Math.abs(grain.lateral(SOFT, 40, 7, 3000, 60));
    expect(fast).toBeGreaterThan(slow);
    expect(faster).toBeCloseTo(fast);
  });
});
