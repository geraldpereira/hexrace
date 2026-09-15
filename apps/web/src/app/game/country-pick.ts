import { ChangeDetectionStrategy, Component, type OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { type MenuItem, MenuList } from '@hexrace/hud';
import { type TrackMode } from '@hexrace/track';

import { type CatalogueCountry } from '@ui/game/catalogue';
import { GameTracks } from '@ui/game/game-tracks';

const TITLES: Readonly<Record<TrackMode, string>> = { track: 'Race', rally: 'Rally' };

/**
 * Where the country is chosen (functional spec 7.1), the same screen for both modes: the
 * catalogue says which countries have something to offer in the mode asked for, and nothing else
 * is shown. An address that names no mode leads home without building anything; back leads home.
 */
@Component({
  selector: 'hr-country-pick',
  imports: [MenuList],
  template: `
    <main>
      <h1>{{ title() }}</h1>
      <hr-menu-list [items]="countries()" (chosen)="pick($event)" (cancelled)="home()" />
      <button type="button" class="quiet" (click)="home()">back</button>
    </main>
  `,
  styleUrl: './country-pick.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CountryPick implements OnInit {
  readonly countries = signal<readonly MenuItem[]>([]);
  readonly title = signal('');

  private readonly games = inject(GameTracks);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private mode: TrackMode = 'track';

  ngOnInit(): void {
    const mode = this.games.modeOf(this.route.snapshot.paramMap.get('mode'));
    if (!mode) {
      this.home();
      return;
    }
    this.mode = mode;
    this.title.set(TITLES[mode]);
    void this.games.countries(mode).then((countries: CatalogueCountry[]) => {
      this.countries.set(
        countries.map((country: CatalogueCountry) => ({
          id: country.id,
          label: country.name,
          icon: 'public',
        })),
      );
    });
  }

  /** On to the tracks that country offers in this mode. */
  pick(id: string): void {
    void this.router.navigate(['/play', this.mode, id]);
  }

  home(): void {
    void this.router.navigate(['/']);
  }
}
