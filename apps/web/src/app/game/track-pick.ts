import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { MenuGrid, TrackCard } from '@hexrace/hud';

import { GameTracks, type PlayableTrack } from '@ui/game/game-tracks';

/**
 * Where the race is chosen (functional spec 7.1): the playable tracks as cards, each with the
 * best time saved for it, walked with the pad, the keys, the mouse or a finger. The card knows
 * nothing of being picked; the grid rings it. Going back leads home.
 */
@Component({
  selector: 'hr-track-pick',
  imports: [MenuGrid, TrackCard],
  template: `
    <main>
      <h1>Track</h1>
      <hr-menu-grid
        [count]="tracks.length"
        [columns]="2"
        (chosen)="race($event)"
        (cancelled)="home()"
      >
        @for (playable of tracks; track playable.track.id) {
          <hr-track-card [track]="playable.summary" />
        }
      </hr-menu-grid>
      <button type="button" class="quiet" (click)="home()">back</button>
    </main>
  `,
  styleUrl: './track-pick.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrackPick {
  readonly tracks: readonly PlayableTrack[] = inject(GameTracks).all();

  private readonly router = inject(Router);

  /** Drives the track at that place in the grid. */
  race(cell: number): void {
    const playable = this.tracks[cell];
    if (playable) void this.router.navigate(['/race', playable.track.id]);
  }

  home(): void {
    void this.router.navigate(['/']);
  }
}
