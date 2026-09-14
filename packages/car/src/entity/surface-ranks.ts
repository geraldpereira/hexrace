import { type SurfaceFeel } from '@car/entity/surface-feel';

/** The ranks of one zone, at least one, the grippiest first. */
export type SurfaceRanks = readonly [SurfaceFeel, ...SurfaceFeel[]];
