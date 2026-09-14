import '@hexrace/commons';

/** A contact the car made, with how fast it was going and what it ran into. */
export interface CarCollision {
  readonly speedKmh: number;
  readonly other: string;
}

/** A gear change, as Jolt or the manual box engages it. */
export interface CarShift {
  readonly from: number;
  readonly to: number;
}

/** The car was put back upright at its start, by the held button or by a fall (3.8). */
export interface CarReset {
  readonly held: number;
}

declare module '@hexrace/commons' {
  interface HexraceEvents {
    'car/collision': CarCollision;
    'car/shift': CarShift;
    'car/reset': CarReset;
  }
}
