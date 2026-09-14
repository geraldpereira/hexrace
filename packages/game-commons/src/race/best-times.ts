import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

import { type SavedTimes, BEST_TIMES_KEY } from '@game-commons/entity/saved-times';

/**
 * The best time of each track, kept in the browser (functional spec 6.1, technical spec 9.1). The
 * key carries the version, so a document that does not read is simply dropped: no migration is
 * written while the game is not deployed. Without a window, as under a bare renderer, nothing is
 * kept and every run reads as a record.
 */
@Injectable({ providedIn: 'root' })
export class BestTimes {
  private readonly storage = inject(DOCUMENT).defaultView?.localStorage ?? null;

  /** The best time saved for a track, in milliseconds, or null when there is none. */
  best(trackId: string): number | null {
    const value = this.tracks()[trackId];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  /** Saves a time if it beats what was there; true when it did, which makes it a record. */
  record(trackId: string, timeMs: number): boolean {
    const best = this.best(trackId);
    if (best !== null && best <= timeMs) return false;
    const saved: SavedTimes = { tracks: { ...this.tracks(), [trackId]: timeMs } };
    this.storage?.setItem(BEST_TIMES_KEY, JSON.stringify(saved));
    return true;
  }

  clear(): void {
    this.storage?.removeItem(BEST_TIMES_KEY);
  }

  private tracks(): Readonly<Record<string, number>> {
    const raw = this.storage?.getItem(BEST_TIMES_KEY) ?? null;
    const saved: unknown = raw === null ? null : this.parse(raw);
    if (typeof saved !== 'object' || saved === null) return {};
    const tracks: unknown = (saved as { tracks?: unknown }).tracks;
    if (typeof tracks !== 'object' || tracks === null) return {};
    return tracks as Readonly<Record<string, number>>;
  }

  private parse(raw: string): unknown {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }
}
