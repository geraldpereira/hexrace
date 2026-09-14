export type HazardSize = 'small' | 'medium' | 'large';

/** A hazard's footprint in units: length along the road, width across. */
export const HAZARD_FOOTPRINT: Readonly<Record<HazardSize, { length: number; width: number }>> = {
  small: { length: 1, width: 1 },
  medium: { length: 2, width: 1 },
  large: { length: 2, width: 2 },
};

/** A rigid object at a fraction of the axis and an offset from the road centre, along the road. */
export interface Hazard {
  readonly kind: 'hazard';
  readonly size: HazardSize;
  readonly at: number;
  readonly offset: number;
}
