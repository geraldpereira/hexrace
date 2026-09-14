import { type RoadType } from '@tile/entity/profile';

/** A patch of another road type on the road, without collision. */
export interface Patch {
  readonly kind: 'patch';
  readonly from: number;
  readonly to: number;
  readonly offset: number;
  readonly width: number;
  readonly road: RoadType;
}
