import { Injectable, inject } from '@angular/core';

import { BestTimes } from '@hexrace/game-commons';
import { type TrackSummary } from '@hexrace/hud';
import { EnvironmentCatalog, SIDE, UNIT_METERS } from '@hexrace/tile';
import { type Track, TrackExamples, TrackValidation } from '@hexrace/track';

const ACROSS_FLATS = Math.sqrt(3);

/** A track the game offers: the track itself, and the card the pick screen draws for it. */
export interface PlayableTrack {
  readonly track: Track;
  readonly summary: TrackSummary;
}

/**
 * What the MVP has to play on (functional spec 10.4): the shipped examples that are loops and
 * that the model accepts, in the order the track package lists them. A Rally track and a track
 * the validation refuses are left out, because the pick screen must only show what can be driven.
 * The length is the count of tiles across their flats: near enough to read a track's size by.
 */
@Injectable({ providedIn: 'root' })
export class GameTracks {
  private readonly bestTimes = inject(BestTimes);
  private readonly environments = inject(EnvironmentCatalog);
  private readonly examples = inject(TrackExamples);
  private readonly validation = inject(TrackValidation);

  /** Every playable track, with its card read afresh, so a new record shows on the way back. */
  all(): PlayableTrack[] {
    return this.examples
      .all()
      .filter((track: Track) => track.mode === 'track' && this.accepted(track))
      .map((track: Track) => ({ track, summary: this.summary(track) }));
  }

  of(id: string): PlayableTrack | null {
    return this.all().find((playable: PlayableTrack) => playable.track.id === id) ?? null;
  }

  private accepted(track: Track): boolean {
    return this.validation.validate(track).issues.length === 0;
  }

  private summary(track: Track): TrackSummary {
    return {
      name: track.name,
      environment: this.environments.of(track.environment).name,
      lengthM: track.tiles.length * SIDE * ACROSS_FLATS * UNIT_METERS,
      bestMs: this.bestTimes.best(track.id),
      locked: false,
      thumbnail: null,
    };
  }
}
