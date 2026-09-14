import { type Zone } from '@tile/entity/zone';

/** What lies under a point: the zone and its rank in the palette, a patch's road type included. */
export interface Surface {
  readonly zone: Zone;
  readonly type: number;
  /** Progress along the axis of the nearest axis point. */
  readonly s: number;
  /** Offset from the road centre in units, negative to the left. */
  readonly offset: number;
}
