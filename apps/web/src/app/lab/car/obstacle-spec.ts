/**
 * The two test obstacles of POC 1, on the lane the car starts in: a wedge to jump from and a bump
 * to thump over. Lengths in metres, `z` along the driving direction. The panel edits this and asks
 * for a rebuild; nothing here is a car characteristic, it is only a bench.
 */
export interface ObstacleSpec {
  x: number;
  width: number;
  ramp: boolean;
  rampZ: number;
  rampLength: number;
  rampHeight: number;
  bump: boolean;
  bumpZ: number;
  bumpRadius: number;
  bumpHeight: number;
}

export const DEFAULT_OBSTACLES: ObstacleSpec = {
  x: 0,
  width: 8,
  ramp: true,
  rampZ: 70,
  rampLength: 7,
  rampHeight: 1.1,
  bump: true,
  bumpZ: 35,
  bumpRadius: 0.3,
  bumpHeight: 0.2,
};
