import { type Rng } from '@commons/random/rng';

/**
 * The sfc32 generator, as the tile POC had it: deterministic, good enough for a track, nothing to
 * do with cryptography. `RngFactory` seeds it from four words; every derived draw goes through
 * `next`, so two streams from one seed stay in step whatever mix of methods they are asked.
 */
export class Sfc32 implements Rng {
  private a = 0;
  private b = 0;
  private c = 0;
  private d = 0;

  /** Sets the four state words; the stream restarts from them. */
  seed(a: number, b: number, c: number, d: number): this {
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    return this;
  }

  next(): number {
    this.a |= 0;
    this.b |= 0;
    this.c |= 0;
    this.d |= 0;
    const t = (((this.a + this.b) | 0) + this.d) | 0;
    this.d = (this.d + 1) | 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) | 0;
    this.c = (this.c << 21) | (this.c >>> 11);
    this.c = (this.c + t) | 0;
    return (t >>> 0) / 4294967296;
  }

  int(n: number): number {
    return Math.floor(this.next() * n);
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T | undefined {
    return items[Math.floor(this.next() * items.length)];
  }

  weighted<T>(items: readonly T[], weight: (item: T) => number): T | undefined {
    const weights = items.map((item) => Math.max(0, weight(item)));
    const total = weights.reduce((sum, w) => sum + w, 0);
    if (total <= 0) return undefined;
    let r = this.next() * total;
    for (const [i, w] of weights.slice(0, -1).entries()) {
      r -= w;
      if (r < 0) return items[i];
    }
    return items[items.length - 1];
  }

  shuffle<T>(items: readonly T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
    }
    return copy;
  }
}
