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

/** First unit of the road-plus-shoulders block. */
export function blockStart(profile: Profile): number {
  return profile.position - profile.leftShoulder;
}

/** The unit after the block (exclusive bound). */
export function blockEnd(profile: Profile): number {
  return profile.position + profile.roadWidth + profile.rightShoulder;
}

export function blockWidth(profile: Profile): number {
  return blockEnd(profile) - blockStart(profile);
}

/** What lies at a unit of the face, left to right. */
export type Zone = 'landscape' | 'shoulder' | 'road';

export function zoneAt(profile: Profile, unit: number): Zone {
  if (unit >= profile.position && unit < profile.position + profile.roadWidth) return 'road';
  if (unit >= blockStart(profile) && unit < blockEnd(profile)) return 'shoulder';
  return 'landscape';
}

/** The eight units of the face, left to right. */
export function zones(profile: Profile): Zone[] {
  return Array.from({ length: FACE_WIDTH }, (_, unit) => zoneAt(profile, unit));
}

/** The invariants of the functional spec 2.1 that fail, in words; empty when the profile holds. */
export function profileErrors(profile: Profile): string[] {
  const errors: string[] = [];
  const { position, roadWidth, height } = profile;
  if (!Number.isInteger(roadWidth) || roadWidth < MIN_ROAD_WIDTH || roadWidth > MAX_ROAD_WIDTH) {
    errors.push(`road of ${roadWidth} units, expected ${MIN_ROAD_WIDTH} to ${MAX_ROAD_WIDTH}`);
  }
  if (blockWidth(profile) > MAX_BLOCK_WIDTH) {
    errors.push(
      `road plus shoulders make ${blockWidth(profile)} units, at most ${MAX_BLOCK_WIDTH}`,
    );
  }
  if (!Number.isInteger(position)) {
    errors.push(`position ${position} is not whole`);
  } else {
    if (blockStart(profile) < MIN_LANDSCAPE_WIDTH) {
      errors.push(`no landscape on the left: the block starts at unit ${blockStart(profile)}`);
    }
    if (blockEnd(profile) > FACE_WIDTH - MIN_LANDSCAPE_WIDTH) {
      errors.push(`no landscape on the right: the block ends at unit ${blockEnd(profile)}`);
    }
  }
  if (!Number.isInteger(height) || height < MIN_HEIGHT || height > MAX_HEIGHT) {
    errors.push(`height ${height}, expected a whole number from ${MIN_HEIGHT} to ${MAX_HEIGHT}`);
  }
  return errors;
}

export function isValidProfile(profile: Profile): boolean {
  return profileErrors(profile).length === 0;
}

/** Two profiles equal in every field: the joining condition of the functional spec 2.6. */
export function sameProfile(a: Profile, b: Profile): boolean {
  return (
    a.position === b.position &&
    a.roadWidth === b.roadWidth &&
    a.leftShoulder === b.leftShoulder &&
    a.rightShoulder === b.rightShoulder &&
    a.height === b.height &&
    a.road === b.road &&
    a.shoulder === b.shoulder &&
    a.landscape === b.landscape
  );
}
