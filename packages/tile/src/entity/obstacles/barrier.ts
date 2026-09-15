/** What a barrier reserves in the data, in units, and how thick its body is, in metres. */
export const BARRIER_FOOTPRINT_WIDTH = 1;
export const BARRIER_BODY_METERS = 0.4;

/**
 * On the unit bordering the road on the chosen side, whether a shoulder is there or not. The wall
 * itself stands against the road edge, at the inner end of that unit: what is reserved behind it is
 * scenery, so the driver scrapes the barrier rather than a line in the middle of the shoulder.
 */
export interface Barrier {
  readonly kind: 'barrier';
  readonly side: 'left' | 'right';
  readonly from: number;
  readonly to: number;
}
