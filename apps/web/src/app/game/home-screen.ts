import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { type MenuItem, MenuList } from '@hexrace/hud';

const CHOICES: readonly MenuItem[] = [{ id: 'track', label: 'Race', icon: 'flag' }];

/**
 * The game's front page (functional spec 7.1), cut to what the MVP plays: the title and one
 * choice, Track mode. No dead button for a mode that does not exist yet; the lab is reachable
 * underneath, quietly, because it is the developer's door and not an entry of the game.
 */
@Component({
  selector: 'hr-home-screen',
  imports: [RouterLink, MenuList],
  template: `
    <main>
      <h1>HexRace</h1>
      <p class="tagline">Arcade rally on hexagonal tiles.</p>
      <hr-menu-list [items]="choices" (chosen)="pickTrack()" />
      <a class="quiet" routerLink="/lab">lab</a>
    </main>
  `,
  styleUrl: './home-screen.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeScreen {
  readonly choices = CHOICES;

  private readonly router = inject(Router);

  /** The one choice of the MVP: on to the track it is run on. */
  pickTrack(): void {
    void this.router.navigate(['/tracks']);
  }
}
