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
