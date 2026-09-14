import { Injectable } from '@angular/core';
import {
  type Barrier,
  type Hazard,
  type HazardSize,
  type Obstacle,
  type Patch,
  type RoadBand,
  type RoadType,
} from '@hexrace/tile';

const FRACTION = String.raw`(0(?:\.\d+)?|1(?:\.0+)?)`;
const NUMBER = String.raw`(-?\d+(?:\.\d+)?)`;
const HAZARD = new RegExp(String.raw`^hazard:(small|medium|large)@${FRACTION}(?:/${NUMBER})?$`);
const BARRIER = new RegExp(String.raw`^barrier:(left|right)(?:@${FRACTION}-${FRACTION})?$`);
const BAND = new RegExp(String.raw`^(ramp|bump)@${FRACTION}-${FRACTION}$`);
const PATCH = new RegExp(
  String.raw`^patch:([123])@${FRACTION}-${FRACTION}(?:/${NUMBER}(?:x${NUMBER})?)?$`,
);

/**
 * One obstacle as a track file writes it (technical spec 3.3), each placed relative to the road:
 * `hazard:<size>@<fraction>[/<offset>]`, `barrier:<side>[@<from>-<to>]`, `ramp@<from>-<to>`,
 * `bump@<from>-<to>`, `patch:<road rank>@<from>-<to>[/<offset>[x<width>]]`. Reading what it
 * writes gives the obstacle back, defaults omitted.
 */
@Injectable({ providedIn: 'root' })
export class ObstacleText {
  parse(text: string): Obstacle | null {
    return this.hazard(text) ?? this.barrier(text) ?? this.band(text) ?? this.patch(text);
  }

  serialize(obstacle: Obstacle): string {
    switch (obstacle.kind) {
      case 'hazard':
        return `hazard:${obstacle.size}@${this.num(obstacle.at)}${this.offset(obstacle.offset)}`;
      case 'barrier':
        return `barrier:${obstacle.side}${this.wholeTile(obstacle) ? '' : this.at(obstacle)}`;
      case 'ramp':
      case 'bump':
        return `${obstacle.kind}@${this.span(obstacle)}`;
      case 'patch':
        return `patch:${obstacle.road}@${this.span(obstacle)}${this.patchTail(obstacle)}`;
    }
  }

  private hazard(text: string): Hazard | null {
    const m = HAZARD.exec(text);
    if (!m) return null;
    return {
      kind: 'hazard',
      size: m[1] as HazardSize,
      at: Number(m[2]),
      offset: Number(m[3] ?? 0),
    };
  }

  private barrier(text: string): Barrier | null {
    const m = BARRIER.exec(text);
    if (!m) return null;
    return {
      kind: 'barrier',
      side: m[1] as Barrier['side'],
      from: Number(m[2] ?? 0),
      to: Number(m[3] ?? 1),
    };
  }

  private band(text: string): RoadBand | null {
    const m = BAND.exec(text);
    if (!m) return null;
    return { kind: m[1] as RoadBand['kind'], from: Number(m[2]), to: Number(m[3]) };
  }

  private patch(text: string): Patch | null {
    const m = PATCH.exec(text);
    if (!m) return null;
    return {
      kind: 'patch',
      road: Number(m[1]) as RoadType,
      from: Number(m[2]),
      to: Number(m[3]),
      offset: Number(m[4] ?? 0),
      width: Number(m[5] ?? 1),
    };
  }

  private patchTail(patch: Patch): string {
    if (patch.offset === 0 && patch.width === 1) return '';
    const width = patch.width === 1 ? '' : `x${this.num(patch.width)}`;
    return `/${this.num(patch.offset)}${width}`;
  }

  private offset(value: number): string {
    return value === 0 ? '' : `/${this.num(value)}`;
  }

  private at(obstacle: { readonly from: number; readonly to: number }): string {
    return `@${this.span(obstacle)}`;
  }

  private wholeTile(obstacle: { readonly from: number; readonly to: number }): boolean {
    return obstacle.from === 0 && obstacle.to === 1;
  }

  private span(obstacle: { readonly from: number; readonly to: number }): string {
    return `${this.num(obstacle.from)}-${this.num(obstacle.to)}`;
  }

  private num(value: number): string {
    return String(Math.round(value * 1000) / 1000);
  }
}
