import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { MenuGrid } from '@hud/menus/menu-grid';

@Component({
  selector: 'hr-menu-grid-host',
  imports: [MenuGrid],
  template: `
    <hr-menu-grid
      [count]="cells().length"
      [columns]="2"
      (chosen)="picked.set($event)"
      (cancelled)="gaveUp.set(true)"
    >
      @for (cell of cells(); track cell) {
        <article>{{ cell }}</article>
      }
    </hr-menu-grid>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuGridHost {
  readonly cells = signal<readonly string[]>(['a', 'b', 'c', 'd']);
  readonly picked = signal(-1);
  readonly gaveUp = signal(false);
}
