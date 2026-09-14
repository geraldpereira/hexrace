import { Clock } from '@hexrace/commons';

export class FakeClock extends Clock {
  ms = 0;

  override now(): number {
    return this.ms;
  }

  tick(seconds: number): void {
    this.ms += seconds * 1000;
  }
}
