import { Injectable, inject } from '@angular/core';
import { type Rng } from '@hexrace/commons';
import {
  type ExitFace,
  type Profile,
  type RoadType,
  type ShoulderType,
  type ShoulderWidth,
  FACE_WIDTH,
  Faces,
  GENERATOR_SLOPE_FACTOR,
  MAX_AMPLITUDE_STEPS,
  MAX_BLOCK_WIDTH,
  MAX_HEIGHT,
  MAX_ROAD_WIDTH,
  MIN_HEIGHT,
  MIN_LANDSCAPE_WIDTH,
  MIN_ROAD_WIDTH,
  Slopes,
} from '@hexrace/tile';
import { clamp } from 'lodash-es';

import { type Dials } from '@track/entity/generation';

const RELIEF_FLOOR = 0.5;
const SHARPEST_EXIT = 4;

/** The lowest and highest face the track has reached, in steps: the amplitude to stay under. */
export interface HeightRange {
  min: number;
  max: number;
}


interface LoopHome {
  readonly height: number;
  readonly remaining: number;
}

/** One step of the generator: what the next exit profile is drawn from. */
export interface ProfileStep {
  readonly rng: Rng;
  readonly dials: Dials;
  readonly entry: Profile;
  readonly exit: ExitFace;
  readonly trend: number;
  readonly range: HeightRange;
  /** The height a loop has to come back to, and how many tiles are left to do it in. */
  readonly home?: LoopHome;
}

type Block = Pick<Profile, 'roadWidth' | 'position' | 'leftShoulder' | 'rightShoulder'>;

/**
 * The exit profile drawn from the entry one: small steps of width, position and types, and a height
 * under three quarters of the exit's threshold (functional spec 2.3), following the trend so that
 * climbs are steady and inside the track's amplitude. The relief dial says both how often the height
 * moves and how far: at 9 every tile climbs or drops, by half the threshold to all of it. In a
 * hairpin only the types and the height move; shifting the road on an arc of radius four twists it.
 */
@Injectable({ providedIn: 'root' })
export class ProfileSteps {
  private readonly faces = inject(Faces);
  private readonly slopes = inject(Slopes);

  /** A centred road of two or three units, shouldered, at any altitude between 40 and 80 m. */
  start(rng: Rng): Profile {
    const roadWidth = 2 + rng.int(2);
    return {
      position: Math.floor((FACE_WIDTH - roadWidth) / 2),
      roadWidth,
      leftShoulder: 1,
      rightShoulder: 1,
      height: 200 + rng.int(200),
      road: 1,
      shoulder: 1,
      landscape: 1,
    };
  }

  next(step: ProfileStep): Profile {
    const { rng, dials, entry } = step;
    const sharp = Math.abs(this.faces.turnOf(step.exit)) === 2;
    const block = sharp ? entry : this.block(step);
    const shoulder = !sharp && rng.chance(dials.variety * 0.1) ? this.rank(rng, 3) : entry.shoulder;
    const road = rng.chance(dials.variety * 0.2) ? this.rank(rng, 3) : entry.road;
    return {
      ...block,
      height: this.height(step),
      road: road as RoadType,
      shoulder: shoulder as ShoulderType,
      landscape: entry.landscape,
    };
  }

  private block(step: ProfileStep): Block {
    const { rng, dials, entry } = step;
    let roadWidth = entry.roadWidth;
    let leftShoulder = entry.leftShoulder;
    let rightShoulder = entry.rightShoulder;
    if (rng.chance(dials.variety * 0.35)) {
      roadWidth = clamp(roadWidth + (rng.chance(0.5) ? 1 : -1), MIN_ROAD_WIDTH, MAX_ROAD_WIDTH);
    }
    if (rng.chance(dials.variety * 0.15)) leftShoulder = this.flip(leftShoulder);
    if (rng.chance(dials.variety * 0.15)) rightShoulder = this.flip(rightShoulder);
    if (roadWidth + leftShoulder + rightShoulder > MAX_BLOCK_WIDTH) leftShoulder = 0;
    const shift = this.faces.turnOf(step.exit) === 0 ? 2 : 1;
    const moved = rng.chance(dials.variety * 0.5)
      ? entry.position + rng.int(2 * shift + 1) - shift
      : entry.position;
    const lowest = MIN_LANDSCAPE_WIDTH + leftShoulder;
    const highest = FACE_WIDTH - MIN_LANDSCAPE_WIDTH - rightShoulder - roadWidth;
    return { roadWidth, leftShoulder, rightShoulder, position: clamp(moved, lowest, highest) };
  }

  private height(step: ProfileStep): number {
    const { rng, dials, entry, range } = step;
    const stay = this.homeward(step, entry.height);
    if (!rng.chance(dials.relief)) return stay;
    const limit = this.slopes.maxHeightSteps(step.exit, GENERATOR_SLOPE_FACTOR);
    const reach = limit * dials.relief;
    const spread = RELIEF_FLOOR + (1 - RELIEF_FLOOR) * rng.next();
    const magnitude = clamp(Math.round(reach * spread), 1, limit);
    const trending = step.trend !== 0 && rng.chance(0.7);
    const drawn = rng.chance(0.5) ? 1 : -1;
    const direction = trending ? step.trend : drawn;
    const wanted = entry.height + direction * magnitude;
    const candidate = clamp(this.homeward(step, wanted), MIN_HEIGHT, MAX_HEIGHT);
    const amplitude = Math.max(range.max, candidate) - Math.min(range.min, candidate);
    return amplitude <= MAX_AMPLITUDE_STEPS ? candidate : stay;
  }

  private homeward(step: ProfileStep, height: number): number {
    const home = step.home;
    if (!home) return height;
    const perTile = this.slopes.maxHeightSteps(SHARPEST_EXIT, GENERATOR_SLOPE_FACTOR);
    const slack = (home.remaining - 1) * perTile;
    return clamp(height, home.height - slack, home.height + slack);
  }

  private flip(width: ShoulderWidth): ShoulderWidth {
    return width === 1 ? 0 : 1;
  }

  private rank(rng: Rng, count: number): number {
    return 1 + rng.int(count);
  }
}
