import { ChangeDetectionStrategy, Component, type OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { MenuGrid, TrackCard, type TrackSummary } from '@hexrace/hud';
import { type TrackMode } from '@hexrace/track';

import { type CountryOffer } from '@ui/game/catalogue';
import { GameTracks, type PlayableTrack } from '@ui/game/game-tracks';

const RANDOM_CELL = 0;

/**
 * Where the track is chosen (functional spec 7.1): the Random entry first, then the tracks the
 * country ships in this mode, each as a card with the best time saved for it. Random draws a
 * fresh seed and puts it in the address, so the same run comes back on a reload. The card knows
 * nothing of being picked; the grid rings it. Going back leads to the country screen.
 */
@Component({
  selector: 'hr-track-pick',
  imports: [MenuGrid, TrackCard],
  template: `
    <main>
      <h1>{{ title() }}</h1>
      <hr-menu-grid
        [count]="cards().length"
        [columns]="2"
        (chosen)="race($event)"
        (cancelled)="back()"
      >
        @for (card of cards(); track $index) {
          <hr-track-card [track]="card" />
        }
      </hr-menu-grid>
      <button type="button" class="quiet" (click)="back()">back</button>
    </main>
  `,
  styleUrl: './track-pick.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrackPick implements OnInit {
  readonly cards = signal<readonly TrackSummary[]>([]);
  readonly title = signal('');

  private readonly games = inject(GameTracks);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private asked: { mode: TrackMode; country: string } = { mode: 'track', country: '' };
  private offered: readonly PlayableTrack[] = [];

  ngOnInit(): void {
    const params = this.route.snapshot.paramMap;
    const mode = this.games.modeOf(params.get('mode'));
    const country = params.get('country') ?? '';
    if (!mode) {
      this.home();
      return;
    }
    this.asked = { mode, country };
    void this.games.offer(mode, country).then((found: CountryOffer | null) => {
      if (found) this.show(found);
      else this.home();
    });
  }

  /** Drives the track at that place in the grid; the first cell draws a seed and races it. */
  race(cell: number): void {
    const { mode, country } = this.asked;
    if (cell === RANDOM_CELL) {
      void this.router.navigate(['/race', mode, country, 'random', this.games.seed()]);
      return;
    }
    const playable = this.offered[cell - 1];
    if (playable) void this.router.navigate(['/race', mode, country, playable.track.id]);
  }

  back(): void {
    void this.router.navigate(['/play', this.asked.mode]);
  }

  private home(): void {
    void this.router.navigate(['/']);
  }

  private show(found: CountryOffer): void {
    this.title.set(found.country.name);
    void this.games.offered(found).then((offered: PlayableTrack[]) => {
      this.offered = offered;
      this.cards.set([
        this.games.randomCard(found),
        ...offered.map((one: PlayableTrack) => one.summary),
      ]);
    });
  }
}
