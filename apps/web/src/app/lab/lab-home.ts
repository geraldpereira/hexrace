import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SHOWCASES } from '@ui/lab/showcases';

/** The lab's front page: the showcases, one per module, in the order of the plan. */
@Component({
  selector: 'hr-lab-home',
  imports: [RouterLink],
  template: `
    <main>
      <h1>HexRace — lab</h1>
      <p>Every module of the game, playable on its own, in the order of the build plan.</p>
      <ol>
        @for (showcase of showcases; track showcase.path) {
          <li [class.pending]="!showcase.ready">
            @if (showcase.ready) {
              <a [routerLink]="'/' + showcase.path">{{ showcase.module }}</a>
            } @else {
              <span>{{ showcase.module }}</span>
            }
            <small>{{ showcase.summary }}</small>
          </li>
        }
      </ol>
    </main>
  `,
  styles: `
    main {
      max-width: 40rem;
      margin: 0 auto;
      padding: 2rem 1rem;
    }
    ol {
      padding-left: 1.5rem;
    }
    li {
      margin: 0.6rem 0;
    }
    li.pending {
      opacity: 0.45;
    }
    small {
      display: block;
      opacity: 0.8;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LabHome {
  readonly showcases = inject(SHOWCASES);
}
