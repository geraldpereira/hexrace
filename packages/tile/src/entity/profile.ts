export const FACE_WIDTH = 8;
export const MIN_ROAD_WIDTH = 1;
export const MAX_ROAD_WIDTH = 5;
/** Road plus shoulders, so that at least one unit of landscape remains on each side. */
export const MAX_BLOCK_WIDTH = 6;
export const MIN_LANDSCAPE_WIDTH = 1;
/** Heights in 20 cm steps (functional spec 2.1); a track's amplitude is bounded apart (2.3). */
export const MIN_HEIGHT = 0;
export const MAX_HEIGHT = 1000;

export type RoadType = 1 | 2 | 3;
export type ShoulderType = 1 | 2 | 3;
export type LandscapeType = 1 | 2;
export type ShoulderWidth = 0 | 1;

/** What lies at a unit of a face, left to right. */
export type Zone = 'landscape' | 'shoulder' | 'road';

/**
 * The profile of a face (functional spec 2.1): left to right, landscape, maybe a shoulder, the
 * road, maybe a shoulder, landscape. Everything counts in units, one unit being a car width, and
 * a face is eight units. Surface types are ranks in the environment's palette (spec 2.2).
 */
export interface Profile {
  /** First unit of road, counted from the left of the face, from 0. */
  readonly position: number;
  /** Road width, 1 to 5 units. */
  readonly roadWidth: number;
  readonly leftShoulder: ShoulderWidth;
  readonly rightShoulder: ShoulderWidth;
  /** Whole height of the face, in 20 cm steps, 0 to 1000. */
  readonly height: number;
  readonly road: RoadType;
  readonly shoulder: ShoulderType;
  readonly landscape: LandscapeType;
}
