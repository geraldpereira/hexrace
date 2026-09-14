import { TestBed } from '@angular/core/testing';

import { Surfaces } from '@car/drive/surfaces';
import { FIRM, ROUGH } from '@car/entity/surfaces/sealed-feels';
import { SLICK } from '@car/entity/surfaces/frozen-feels';

describe('Surfaces', () => {
  let surfaces: Surfaces;

  beforeEach(() => {
    surfaces = TestBed.inject(Surfaces);
  });

  it('answers the feel of a rank, by zone and by environment', () => {
    expect(surfaces.feel({ environment: 'europe', zone: 'road', rank: 1 })).toBe(FIRM);
    expect(surfaces.feel({ environment: 'europe', zone: 'road', rank: 3 })).toBe(ROUGH);
    expect(surfaces.feel({ environment: 'north', zone: 'road', rank: 3 })).toBe(SLICK);
    expect(surfaces.feel({ environment: 'africa', zone: 'shoulder', rank: 2 }).key).toBe('soft');
    expect(surfaces.feel({ environment: 'europe', zone: 'landscape', rank: 2 }).key).toBe('rocky');
  });

  it('falls back on the grippiest rank when the rank is out of the palette', () => {
    expect(surfaces.feel({ environment: 'europe', zone: 'road', rank: 9 })).toBe(FIRM);
    expect(surfaces.feel({ environment: 'europe', zone: 'road', rank: 0 })).toBe(FIRM);
  });

  it('lists the eight ranks of an environment in the order of the palette', () => {
    const ranks = surfaces.of('north');
    expect(ranks).toHaveLength(8);
    expect(ranks[0]).toEqual({ environment: 'north', zone: 'road', rank: 1 });
    expect(ranks[7]).toEqual({ environment: 'north', zone: 'landscape', rank: 2 });
  });
});
