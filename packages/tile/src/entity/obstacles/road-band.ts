/** A ramp or a bump across the whole road, between two fractions of the axis. */
export interface RoadBand {
  readonly kind: 'ramp' | 'bump';
  readonly from: number;
  readonly to: number;
}
