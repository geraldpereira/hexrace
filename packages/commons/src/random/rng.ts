/** A stream of pseudo-random numbers: the same seed always gives the same stream. */
export interface Rng {
  /** A real in [0, 1). */
  next(): number;
  /** An integer in [0, n). */
  int(n: number): number;
  /** True with probability p. */
  chance(p: number): boolean;
  /** One item at random, or undefined when the list is empty. */
  pick<T>(items: readonly T[]): T | undefined;
  /** One item drawn by positive weights; undefined when every weight is zero. */
  weighted<T>(items: readonly T[], weight: (item: T) => number): T | undefined;
  /** A shuffled copy. */
  shuffle<T>(items: readonly T[]): T[];
}

/**
 * sfc32 seeded by a cyrb128 hash of the seed string, as the tile POC had it: deterministic, good
 * enough for a track, nothing to do with cryptography. Every derived draw goes through `next`, so
 * two streams from one seed stay in step whatever mix of methods they are asked.
 */
export function createRng(seed: string): Rng {
  let [a, b, c, d] = cyrb128(seed);
  const next = (): number => {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
  return {
    next,
    int: (n) => Math.floor(next() * n),
    chance: (p) => next() < p,
    pick: (items) => items[Math.floor(next() * items.length)],
    weighted: (items, weight) => {
      const weights = items.map((item) => Math.max(0, weight(item)));
      const total = weights.reduce((sum, w) => sum + w, 0);
      if (total <= 0) return undefined;
      let r = next() * total;
      for (const [i, w] of weights.slice(0, -1).entries()) {
        r -= w;
        if (r < 0) return items[i];
      }
      return items[items.length - 1];
    },
    shuffle: (items) => {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [copy[i], copy[j]] = [copy[j]!, copy[i]!];
      }
      return copy;
    },
  };
}

function cyrb128(str: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
}
