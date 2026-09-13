import { TestBed } from '@angular/core/testing';

import { Random } from '@commons/random/random';
import { createRng } from '@commons/random/rng';

describe('createRng', () => {
  it('replays the same stream for the same seed, another for another seed', () => {
    const a = createRng('track-1');
    const b = createRng('track-1');
    const c = createRng('track-2');
    const fromA = [a.next(), a.next(), a.next()];
    expect([b.next(), b.next(), b.next()]).toEqual(fromA);
    expect([c.next(), c.next(), c.next()]).not.toEqual(fromA);
    for (const v of fromA) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('draws integers, chances and picks inside their bounds', () => {
    const rng = createRng('bounds');
    for (let i = 0; i < 200; i++) {
      const n = rng.int(6);
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(6);
      expect(Number.isInteger(n)).toBe(true);
    }
    expect(rng.chance(1)).toBe(true);
    expect(rng.chance(0)).toBe(false);
    expect(['a', 'b']).toContain(rng.pick(['a', 'b']));
    expect(rng.pick([])).toBeUndefined();
  });

  it('draws by weight, never a zero-weight item, nothing when all weights are zero', () => {
    const rng = createRng('weights');
    const items = ['never', 'rare', 'common'];
    const weights: Record<string, number> = { never: 0, rare: 1, common: 9 };
    const weight = (item: string): number => weights[item] ?? 0;
    const counts = { never: 0, rare: 0, common: 0 };
    for (let i = 0; i < 500; i++) counts[rng.weighted(items, weight) as keyof typeof counts]++;
    expect(counts.never).toBe(0);
    expect(counts.common).toBeGreaterThan(counts.rare);
    expect(rng.weighted(items, () => 0)).toBeUndefined();
    expect(rng.weighted(items, () => -1)).toBeUndefined();
  });

  it('shuffles a copy that keeps every item', () => {
    const rng = createRng('shuffle');
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const shuffled = rng.shuffle(items);
    expect(shuffled).not.toBe(items);
    expect([...shuffled].sort((x, y) => x - y)).toEqual(items);
    expect(shuffled).not.toEqual(items);
  });
});

describe('Random', () => {
  it('hands out a replayable stream for a seed and a different one each time otherwise', () => {
    TestBed.configureTestingModule({});
    const random = TestBed.inject(Random);
    expect(random.seeded('x').next()).toBe(random.seeded('x').next());
    expect(random.fresh().next()).not.toBe(random.fresh().next());
  });
});
