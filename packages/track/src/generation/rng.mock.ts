import { type Rng } from '@hexrace/commons';

export class SilentRng implements Rng {
  next(): number {
    return 0;
  }

  int(): number {
    return 0;
  }

  chance(): boolean {
    return false;
  }

  pick<T>(items: readonly T[]): T | undefined {
    return items[0];
  }

  weighted<T>(): T | undefined {
    return undefined;
  }

  shuffle<T>(items: readonly T[]): T[] {
    return [...items];
  }
}
