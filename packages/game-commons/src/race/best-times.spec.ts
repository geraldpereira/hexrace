import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';

import { BEST_TIMES_KEY } from '@game-commons/entity/saved-times';
import { BestTimes } from '@game-commons/race/best-times';

describe('BestTimes', () => {
  function times(): BestTimes {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    return TestBed.inject(BestTimes);
  }

  beforeEach(() => {
    localStorage.clear();
  });

  it('knows no time for a track it has never seen', () => {
    expect(times().best('europe-ring-01')).toBeNull();
  });

  it('saves a first time, then only what beats it', () => {
    const best = times();
    expect(best.record('europe-ring-01', 90_000)).toBe(true);
    expect(best.best('europe-ring-01')).toBe(90_000);
    expect(best.record('europe-ring-01', 95_000)).toBe(false);
    expect(best.record('europe-ring-01', 90_000)).toBe(false);
    expect(best.record('europe-ring-01', 88_000)).toBe(true);
    expect(best.best('europe-ring-01')).toBe(88_000);
    expect(best.record('north-catalog-01', 12_000)).toBe(true);
    expect(best.best('europe-ring-01')).toBe(88_000);
  });

  it('drops a document it cannot read rather than migrating it', () => {
    localStorage.setItem(BEST_TIMES_KEY, 'not json at all');
    expect(times().best('europe-ring-01')).toBeNull();
    localStorage.setItem(BEST_TIMES_KEY, '42');
    expect(times().best('europe-ring-01')).toBeNull();
    localStorage.setItem(BEST_TIMES_KEY, '{"tracks":null}');
    expect(times().best('europe-ring-01')).toBeNull();
    localStorage.setItem(BEST_TIMES_KEY, '{"tracks":{"europe-ring-01":"soon"}}');
    expect(times().best('europe-ring-01')).toBeNull();
  });

  it('forgets everything on demand', () => {
    const best = times();
    best.record('europe-ring-01', 90_000);
    best.clear();
    expect(best.best('europe-ring-01')).toBeNull();
  });

  it('keeps nothing without a window, and every run is then a record', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: { defaultView: null } }],
    });
    const best = TestBed.inject(BestTimes);
    expect(best.record('europe-ring-01', 90_000)).toBe(true);
    expect(best.record('europe-ring-01', 95_000)).toBe(true);
    best.clear();
    expect(best.best('europe-ring-01')).toBeNull();
  });
});
