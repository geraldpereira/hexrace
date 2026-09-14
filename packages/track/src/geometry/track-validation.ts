import { Injectable, inject } from '@angular/core';
import {
  type Obstacle,
  type Tile,
  type TileIssue,
  type TurnKind,
  EnvironmentCatalog,
  Faces,
  HEIGHT_STEP_METERS,
  MAX_AMPLITUDE_STEPS,
  MAX_SLOPE,
  Slopes,
  TileValidation,
} from '@hexrace/tile';

import { type TrackIssue, type TrackReview } from '@track/entity/issue';
import { type LineMark } from '@track/entity/mark';
import { type Overlap, type PlacedTile, type Placement } from '@track/entity/placement';
import { type Track, TRACK_MODES } from '@track/entity/track';
import { TrackMarks } from '@track/geometry/track-marks';
import { TrackPlacement } from '@track/geometry/track-placement';
import { TrackProfiles } from '@track/geometry/track-profiles';
import { TrackSweeps } from '@track/geometry/track-sweeps';

const WHERE: Readonly<Record<TurnKind, string>> = {
  straight: 'on a straight',
  wide: 'in a wide turn',
  sharp: 'in a sharp turn',
};

/**
 * What a whole track refuses (functional spec 2.6 and 5.5), in one pass: a sound header, a valid
 * profile per tile, no tile on an occupied cell, a loop that closes, obstacles that fit, slopes
 * under the threshold of their exit, an amplitude under 200 m, and no hairpin under a line. The
 * joining rule needs no check: an entry profile is the previous exit profile by construction.
 */
@Injectable({ providedIn: 'root' })
export class TrackValidation {
  private readonly environments = inject(EnvironmentCatalog);
  private readonly faces = inject(Faces);
  private readonly marks = inject(TrackMarks);
  private readonly placement = inject(TrackPlacement);
  private readonly profiles = inject(TrackProfiles);
  private readonly slopes = inject(Slopes);
  private readonly sweeps = inject(TrackSweeps);
  private readonly tiles = inject(TileValidation);

  validate(track: Track): TrackReview {
    const placement = this.placement.place(track);
    const issues: TrackIssue[] = [
      ...this.header(track),
      ...this.profileIssues(track),
      ...this.gridIssues(track, placement),
      ...this.obstacleIssues(track, placement),
      ...this.slopeIssues(track),
      ...this.amplitude(track),
      ...this.lineIssues(track),
    ];
    const faulty = new Set<number>();
    for (const issue of issues) if (issue.tile !== null) faulty.add(issue.tile);
    return { placement, issues, faulty };
  }

  isValid(review: TrackReview): boolean {
    return review.issues.length === 0;
  }

  /** An issue in words, prefixed by the tile it concerns when there is one. */
  format(issue: TrackIssue): string {
    return issue.tile === null ? issue.message : `tile ${issue.tile}: ${issue.message}`;
  }

  private header(track: Track): TrackIssue[] {
    const issues: TrackIssue[] = [];
    const environment: string = track.environment;
    const mode: string = track.mode;
    if (track.id.trim() === '') issues.push(this.whole('empty-id', 'empty id'));
    if (!this.environments.isId(track.environment)) {
      issues.push(this.whole('unknown-environment', `unknown environment: ${environment}`));
    }
    if (!(TRACK_MODES as readonly string[]).includes(mode)) {
      issues.push(this.whole('unknown-mode', `unknown mode: ${mode}`));
    }
    if (track.laps !== undefined && track.mode !== 'track') {
      issues.push(this.whole('laps-outside-track', 'laps mean nothing outside Track mode'));
    }
    if (track.tiles.length === 0) issues.push(this.whole('no-tile', 'no tile'));
    return issues;
  }

  private profileIssues(track: Track): TrackIssue[] {
    return track.tiles.flatMap((tile: Tile, index: number) =>
      this.tiles.profile(tile.profile).map((issue: TileIssue) => ({
        code: 'profile' as const,
        tile: index,
        message: issue.message,
      })),
    );
  }

  private gridIssues(track: Track, placement: Placement): TrackIssue[] {
    const issues: TrackIssue[] = this.placement.overlaps(placement).map((overlap: Overlap) => ({
      code: 'overlap' as const,
      tile: overlap.tile,
      message: `covers tile ${overlap.previous} at (${overlap.cell.q},${overlap.cell.r})`,
    }));
    const closure = this.placement.closureIssue(track, placement);
    if (closure)
      issues.push({ code: 'not-closed', tile: track.tiles.length - 1, message: closure });
    return issues;
  }

  private obstacleIssues(track: Track, placement: Placement): TrackIssue[] {
    return placement.tiles.flatMap((placed: PlacedTile) => {
      const sweep = this.sweeps.of(track, placed);
      return (placed.tile.obstacles ?? []).flatMap((obstacle: Obstacle) =>
        this.tiles.obstacle(sweep, obstacle).map((issue: TileIssue) => ({
          code: 'obstacle' as const,
          tile: placed.index,
          message: `${issue.subject}: ${issue.message}`,
        })),
      );
    });
  }

  private slopeIssues(track: Track): TrackIssue[] {
    const issues: TrackIssue[] = [];
    track.tiles.forEach((tile: Tile, index: number) => {
      const kind = this.faces.turnKind(tile.exit);
      const climb = tile.profile.height - this.profiles.entryProfile(track, index).height;
      const slope = Math.abs(this.slopes.slopeOf(tile.exit, climb));
      if (slope > MAX_SLOPE[kind] + 1e-9) {
        issues.push({
          code: 'slope',
          tile: index,
          message: `slope of ${this.percent(slope)} ${WHERE[kind]}, at most ${this.percent(MAX_SLOPE[kind])}`,
        });
      }
    });
    return issues;
  }

  private amplitude(track: Track): TrackIssue[] {
    const heights = track.tiles.map((tile: Tile) => tile.profile.height);
    if (heights.length === 0) return [];
    const amplitude = Math.max(...heights) - Math.min(...heights);
    if (amplitude <= MAX_AMPLITUDE_STEPS) return [];
    return [
      this.whole(
        'amplitude',
        `amplitude of ${this.meters(amplitude)}, at most ${this.meters(MAX_AMPLITUDE_STEPS)}`,
      ),
    ];
  }

  private lineIssues(track: Track): TrackIssue[] {
    return this.marks.marks(track).flatMap((mark: LineMark) => {
      const message = this.marks.issue(track, mark);
      return message ? [{ code: 'hairpin-line' as const, tile: mark.tile, message }] : [];
    });
  }

  private whole(code: TrackIssue['code'], message: string): TrackIssue {
    return { code, tile: null, message };
  }

  private percent(slope: number): string {
    return `${String(Math.round(slope * 100))} %`;
  }

  private meters(steps: number): string {
    return `${String(Math.round(steps * HEIGHT_STEP_METERS))} m`;
  }
}
