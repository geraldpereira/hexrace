import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

import { formatTime } from '@hud/commons/format-time';

/** A track as the pick screens show it (functional spec 7.5). */
export interface TrackSummary {
  readonly name: string;
  readonly environment: string;
  readonly lengthM: number;
  readonly bestMs: number | null;
  readonly locked: boolean;
  /** The 2D preview, as an image URL, or nothing yet. */
  readonly thumbnail: string | null;
}

@Component({
  selector: 'hr-track-card',
  imports: [MatIcon],
  template: `
    <article [class.locked]="track().locked">
      <div class="thumb">
        @if (track().thumbnail; as url) {
          <img [src]="url" alt="" />
        }
        @if (track().locked) {
          <mat-icon class="lock" aria-label="Locked">lock</mat-icon>
        }
      </div>
      <h3>{{ track().name }}</h3>
      <p class="meta">{{ track().environment }} · {{ lengthText() }}</p>
      <p class="best">
        <mat-icon aria-hidden="true">star</mat-icon>
        <span>{{ bestText() }}</span>
      </p>
    </article>
  `,
  styles: `
    article {
      width: 12rem;
      padding: 0.6rem;
      border-radius: 0.6rem;
      background: var(--hr-card, rgba(255, 255, 255, 0.06));
    }
    article.locked {
      opacity: 0.55;
    }
    .thumb {
      position: relative;
      aspect-ratio: 4 / 3;
      border-radius: 0.4rem;
      background: var(--hr-surface, #1e262f);
      overflow: hidden;
    }
    .thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .lock {
      position: absolute;
      inset: 0;
      margin: auto;
    }
    h3 {
      margin: 0.5rem 0 0.1rem;
      font-size: 1rem;
    }
    p {
      margin: 0.1rem 0;
      font-size: 0.8rem;
      opacity: 0.85;
    }
    .best {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      font-variant-numeric: tabular-nums;
    }
    .best mat-icon {
      font-size: 1rem;
      width: 1rem;
      height: 1rem;
      color: var(--hr-accent, #ffaa00);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrackCard {
  readonly track = input.required<TrackSummary>();
  readonly lengthText = computed(() => `${(this.track().lengthM / 1000).toFixed(1)} km`);
  readonly bestText = computed(() => {
    const best = this.track().bestMs;
    return best === null ? 'no time yet' : formatTime(best);
  });
}
