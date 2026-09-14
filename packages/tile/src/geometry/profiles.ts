import { Injectable } from '@angular/core';

import { type Profile, FACE_WIDTH } from '@tile/entity/profile';
import { type Zone } from '@tile/entity/zone';

/**
 * Reads a face profile (functional spec 2.1): where the road-plus-shoulders block starts and ends,
 * what lies at each unit, and whether two profiles join (functional spec 2.6). Validity is
 * `TileValidation`'s business.
 */
@Injectable({ providedIn: 'root' })
export class Profiles {
  /** First unit of the road-plus-shoulders block. */
  blockStart(profile: Profile): number {
    return profile.position - profile.leftShoulder;
  }

  /** The unit after the block (exclusive bound). */
  blockEnd(profile: Profile): number {
    return profile.position + profile.roadWidth + profile.rightShoulder;
  }

  blockWidth(profile: Profile): number {
    return this.blockEnd(profile) - this.blockStart(profile);
  }

  /** The middle of the road, in units from the left of the face. */
  roadCenter(profile: Profile): number {
    return profile.position + profile.roadWidth / 2;
  }

  /** Left and right bounds of the road, in units from the left of the face. */
  roadSpan(profile: Profile): [number, number] {
    return [profile.position, profile.position + profile.roadWidth];
  }

  blockSpan(profile: Profile): [number, number] {
    return [this.blockStart(profile), this.blockEnd(profile)];
  }

  zoneAt(profile: Profile, unit: number): Zone {
    if (unit >= profile.position && unit < profile.position + profile.roadWidth) return 'road';
    if (unit >= this.blockStart(profile) && unit < this.blockEnd(profile)) return 'shoulder';
    return 'landscape';
  }

  /** The eight units of the face, left to right. */
  zones(profile: Profile): Zone[] {
    return Array.from({ length: FACE_WIDTH }, (_, unit) => this.zoneAt(profile, unit));
  }

  /** Two profiles equal in every field: the joining condition of the functional spec 2.6. */
  same(a: Profile, b: Profile): boolean {
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
}
