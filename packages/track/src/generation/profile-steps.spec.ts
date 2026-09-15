import { TestBed } from '@angular/core/testing';
import { Random, type Rng } from '@hexrace/commons';
import { type Profile, MAX_BLOCK_WIDTH, MAX_HEIGHT } from '@hexrace/tile';

import { type Dials } from '@track/entity/generation';
import { type ProfileStep, ProfileSteps } from '@track/generation/profile-steps';

const STILL: Dials = { turning: 0, sharpness: 0, relief: 0, variety: 0, obstacles: 0 };
const BUSY: Dials = { turning: 1, sharpness: 1, relief: 1, variety: 1, obstacles: 1 };

describe('ProfileSteps', () => {
  let steps: ProfileSteps;
  let rng: Rng;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    steps = TestBed.inject(ProfileSteps);
    rng = TestBed.inject(Random).seeded('profiles');
  });

  function step(changes: Partial<ProfileStep> = {}): ProfileStep {
    return {
      rng,
      dials: BUSY,
      entry: steps.start(rng),
      exit: 12,
      trend: 0,
      range: { min: 0, max: 0 },
      faceRoads: 3,
      ...changes,
    };
  }

  it('starts on a centred road of two or three units, shouldered, at any altitude', () => {
    for (let i = 0; i < 40; i++) {
      const profile = steps.start(TestBed.inject(Random).seeded(`start-${String(i)}`));
      expect(profile.roadWidth).toBeGreaterThanOrEqual(2);
      expect(profile.roadWidth).toBeLessThanOrEqual(3);
      expect(profile.leftShoulder).toBe(1);
      expect(profile.height).toBeGreaterThanOrEqual(200);
      expect(profile.height).toBeLessThan(400);
    }
  });

  it('changes nothing when every dial is at rest', () => {
    const entry = steps.start(rng);
    expect(steps.next(step({ entry, dials: STILL }))).toEqual(entry);
  });

  it('keeps the block within six units and the landscape on both sides', () => {
    let entry = steps.start(rng);
    for (let i = 0; i < 400; i++) {
      const next: Profile = steps.next(step({ entry, exit: i % 3 === 0 ? 2 : 12 }));
      expect(next.roadWidth + next.leftShoulder + next.rightShoulder).toBeLessThanOrEqual(
        MAX_BLOCK_WIDTH,
      );
      expect(next.position - next.leftShoulder).toBeGreaterThanOrEqual(1);
      expect(next.position + next.roadWidth + next.rightShoulder).toBeLessThanOrEqual(7);
      expect(next.height).toBeLessThanOrEqual(MAX_HEIGHT);
      entry = next;
    }
  });

  it('leaves the block alone in a hairpin: only types and height move', () => {
    let entry = steps.start(rng);
    for (let i = 0; i < 200; i++) {
      const next = steps.next(step({ entry, exit: 4 }));
      expect({ ...next, road: 0, shoulder: 0, height: 0 }).toEqual({
        ...entry,
        road: 0,
        shoulder: 0,
        height: 0,
      });
      entry = next;
    }
  });

  it('follows the trend and refuses to break the amplitude', () => {
    const entry = { ...steps.start(rng), height: 500 };
    const climbing = Array.from({ length: 60 }, () =>
      steps.next(step({ entry, trend: 1, range: { min: 500, max: 500 } })),
    );
    expect(climbing.some((profile: Profile) => profile.height > 500)).toBe(true);
    const boxed = Array.from({ length: 20 }, () =>
      steps.next(step({ entry, trend: 1, range: { min: -100, max: 1000 } })),
    );
    expect(boxed.every((profile: Profile) => profile.height === 500)).toBe(true);
  });

  it('shrinks the road when both shoulders are already gone', () => {
    const wide: Profile = {
      ...steps.start(rng),
      roadWidth: 5,
      position: 1,
      leftShoulder: 0,
      rightShoulder: 0,
    };
    let seen = false;
    for (let i = 0; i < 200; i++) {
      const next = steps.next(step({ entry: wide }));
      if (next.roadWidth < 5) seen = true;
    }
    expect(seen).toBe(true);
  });
});
