import '@hexrace/commons';

/** The GO was given and the chrono started, for this many laps. */
export interface RaceStart {
  readonly lapCount: number;
}

/** A lap was completed in the direction of travel; `lap` is the one now being driven. */
export interface RaceLap {
  readonly lap: number;
  readonly lapCount: number;
}

/** The race is over: the total time, and whether it beat what was saved for this track. */
export interface RaceFinish {
  readonly timeMs: number;
  readonly record: boolean;
}

/** The car left the terrain and was put back on a tile (functional spec 2.7 and 3.8). */
export interface RaceFall {
  readonly tile: number;
}

declare module '@hexrace/commons' {
  interface HexraceEvents {
    'race/start': RaceStart;
    'race/lap': RaceLap;
    'race/finish': RaceFinish;
    'race/fall': RaceFall;
  }
}
