import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { type MenuItem, MenuList } from '@hexrace/hud';

const CHOICES: readonly MenuItem[] = [
  { id: 'track', label: 'Race', icon: 'flag' },
  { id: 'rally', label: 'Rally', icon: 'route' },
];

/**
 * The game's front page (functional spec 7.1): the title and the two modes that are playable,
 * Race on a loop and Rally point to point. No dead button for a mode that does not exist yet;
 * the lab is reachable underneath, quietly, because it is the developer's door and not an entry
 * of the game.
 */
@Component({
  selector: 'hr-home-screen',
  imports: [RouterLink, MenuList],
  template: `
    <main>
      <h1>HexRace</h1>
      <p class="tagline">Arcade rally on hexagonal tiles.</p>
      <hr-menu-list [items]="choices" (chosen)="play($event)" />
      <a class="quiet" routerLink="/lab">lab</a>
    </main>
  `,
  styleUrl: './home-screen.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeScreen {
  readonly choices = CHOICES;

  private readonly router = inject(Router);

  /** On to the countries that have something to offer in the mode just chosen. */
  play(mode: string): void {
    void this.router.navigate(['/play', mode]);
  }
}
