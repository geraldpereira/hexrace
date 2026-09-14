import { Injectable, inject } from '@angular/core';
import { type Vec2 } from '@hexrace/commons';

import { type TurnKind } from '@tile/entity/face';
import { SIDE } from '@tile/entity/layout';
import { type Zone } from '@tile/entity/zone';
import { type SPoint, type Slice } from '@tile/entity/slice';
import { type ZonePolygon, type ZoneQuad, type ZoneSide } from '@tile/entity/zone';
import { type TileSweep } from '@tile/entity/sweep';
import { Faces } from '@tile/geometry/faces';
import { Layout } from '@tile/geometry/layout';
import { TilePaths } from '@tile/geometry/tile-paths';
import { TileSweeper } from '@tile/geometry/tile-sweeper';

type Edge = keyof Omit<Slice, 's'>;

/**
 * Cuts a tile into slices: at each `s` the lateral line (the perpendicular to the axis, or the
 * arc's radius in a turn) crosses, left to right, the hexagon's edge, the block, the road twice,
 * the block and the edge; two neighbouring slices give five quads, every point of a slice at the
 * axis height of its `s`. `samples` per exit and `apexRadius` are the knobs.
 */
@Injectable({ providedIn: 'root' })
export class TileGeometry {
  /** Slices per tile by exit kind; a sharp turn sweeps 120° on a short axis and needs more. */
  readonly samples: Record<TurnKind, number> = { straight: 24, wide: 36, sharp: 48 };
  /** In a sharp turn the inner landscape shrinks to the shared corner, two heights at once: stop this short of it. */
  apexRadius = 0.01;

  private readonly faces = inject(Faces);
  private readonly layout = inject(Layout);
  private readonly paths = inject(TilePaths);
  private readonly sweeper = inject(TileSweeper);

  /** The slices' `s` values are regular samples, the middle, and each hexagon corner so slices hug the outline. */
  slices(sweep: TileSweep, samples = this.samples[this.faces.turnKind(sweep.exit)]): Slice[] {
    return this.sliceParameters(sweep, samples).map((s) => {
      const b = this.sweeper.boundariesAt(sweep, s);
      const at = (p: Vec2): SPoint => ({ at: p, s });
      return {
        s,
        outerLeft: at(this.outerPoint(sweep, s, -1)),
        blockLeft: at(b.blockLeft),
        roadLeft: at(b.roadLeft),
        roadRight: at(b.roadRight),
        blockRight: at(b.blockRight),
        outerRight: at(this.outerPoint(sweep, s, 1)),
      };
    });
  }

  /** The quads of a tile, one per zone and per pair of slices, types switching at the middle. */
  quads(sweep: TileSweep, samples?: number): ZoneQuad[] {
    const slices = this.slices(sweep, samples);
    const { entry, exitProfile } = sweep;
    const quads: ZoneQuad[] = [];
    for (let i = 0; i + 1 < slices.length; i++) {
      const a = slices[i]!;
      const b = slices[i + 1]!;
      const profile = this.sweeper.profileAt(sweep, (a.s + b.s) / 2);
      const quad = (zone: Zone, side: ZoneSide, type: number, left: Edge, right: Edge): void => {
        quads.push({ zone, side, type, points: [a[left], b[left], b[right], a[right]] });
      };
      quad('landscape', 'left', profile.landscape, 'outerLeft', 'blockLeft');
      if (entry.leftShoulder + exitProfile.leftShoulder > 0) {
        quad('shoulder', 'left', profile.shoulder, 'blockLeft', 'roadLeft');
      }
      quad('road', 'center', profile.road, 'roadLeft', 'roadRight');
      if (entry.rightShoulder + exitProfile.rightShoulder > 0) {
        quad('shoulder', 'right', profile.shoulder, 'roadRight', 'blockRight');
      }
      quad('landscape', 'right', profile.landscape, 'blockRight', 'outerRight');
    }
    return quads;
  }

  /** The zones merged into polygons along the axis, each cut at the middle to carry the entry then the exit types. */
  polygons(sweep: TileSweep, samples?: number): ZonePolygon[] {
    const slices = this.slices(sweep, samples);
    const { entry, exitProfile } = sweep;
    const polygons: ZonePolygon[] = [];
    const merge = (part: Slice[], zone: Zone, side: ZoneSide, type: number, l: Edge, r: Edge) => {
      const points = [...part.map((sl) => sl[l]), ...part.map((sl) => sl[r]).reverse()];
      polygons.push({ zone, side, type, points });
    };
    const mid = slices.findIndex((sl) => sl.s >= 0.5);
    const halves: [Slice[], typeof entry][] = [
      [slices.slice(0, mid + 1), entry],
      [slices.slice(mid), exitProfile],
    ];
    for (const [part, profile] of halves) {
      merge(part, 'landscape', 'left', profile.landscape, 'outerLeft', 'blockLeft');
      if (entry.leftShoulder + exitProfile.leftShoulder > 0) {
        merge(part, 'shoulder', 'left', profile.shoulder, 'blockLeft', 'roadLeft');
      }
      merge(part, 'road', 'center', profile.road, 'roadLeft', 'roadRight');
      if (entry.rightShoulder + exitProfile.rightShoulder > 0) {
        merge(part, 'shoulder', 'right', profile.shoulder, 'roadRight', 'blockRight');
      }
      merge(part, 'landscape', 'right', profile.landscape, 'blockRight', 'outerRight');
    }
    return polygons;
  }

  /** The tile's outline in order, with the slices' own points: left chain out, right chain back. For skirts. */
  boundary(sweep: TileSweep, samples?: number): SPoint[] {
    const slices = this.slices(sweep, samples);
    return [...slices.map((sl) => sl.outerLeft), ...slices.map((sl) => sl.outerRight).reverse()];
  }

  /** Height of a slice point, in units. */
  heightOf(sweep: TileSweep, p: SPoint): number {
    return this.sweeper.heightOfS(sweep, p.s);
  }

  private sliceParameters(sweep: TileSweep, samples: number): number[] {
    const values = Array.from({ length: samples + 1 }, (_, i) => i / samples);
    values.push(0.5);
    for (const corner of this.layout.corners(sweep.center)) {
      const s = this.paths.axisParameter(sweep.center, sweep.heading, sweep.exit, corner);
      if (s > 1e-6 && s < 1 - 1e-6) values.push(s);
    }
    return [...new Set(values.map((v) => Math.round(v * 1e9) / 1e9))].sort((a, b) => a - b);
  }

  private outerPoint(sweep: TileSweep, s: number, side: -1 | 1): Vec2 {
    const axis = this.paths.world(sweep.center, sweep.heading, sweep.exit, s);
    const direction = axis.right.scale(side);
    const corners = this.layout.corners(sweep.center);
    let tExit = Infinity;
    for (let i = 0; i < corners.length; i++) {
      const a = corners[i]!;
      const b = corners[(i + 1) % corners.length]!;
      const normal = b.sub(a).right();
      const denominator = direction.dot(normal);
      if (denominator > -1e-9) continue;
      const t = a.sub(axis.point).dot(normal) / denominator;
      if (t < tExit) tExit = t;
    }
    const hit = axis.point.add(direction.scale(tExit));
    const pivot = this.sharpPivot(sweep);
    if (pivot && hit.distanceTo(pivot) < 1e-6) {
      return axis.point.add(direction.scale(tExit - this.apexRadius));
    }
    return hit;
  }

  private sharpPivot(sweep: TileSweep): Vec2 | null {
    const turn = this.faces.turnOf(sweep.exit);
    if (Math.abs(turn) !== 2) return null;
    const frame = this.layout.entryFrame(sweep.center, sweep.heading);
    return this.layout.facePoint(frame, turn > 0 ? SIDE : 0);
  }
}
