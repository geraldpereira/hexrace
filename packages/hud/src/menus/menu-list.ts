import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

import { type MenuGesture, MenuNavigation } from '@hud/menus/menu-navigation';

/** One row of a menu: the id it answers with, what it reads, and an optional Material Symbol. */
export interface MenuItem {
  readonly id: string;
  readonly label: string;
  readonly icon?: string;
}

/**
 * The menu of an out-of-race screen (functional spec 7.1), walked with the stick, the D-pad, the
 * arrow keys, the mouse or a finger: the rows come in, the current one is held here, `chosen`
 * answers with its id and `cancelled` gives up. A pointer over a row picks it and a click takes
 * it, so one list serves a pad and a touch screen without knowing which is in hand. It wraps
 * around at both ends, because a menu of three rows is quicker to walk that way.
 */
@Component({
  selector: 'hr-menu-list',
  imports: [MatIcon],
  providers: [MenuNavigation],
  template: `
    <ul>
      @for (item of items(); track item.id; let row = $index) {
        <li>
          <button
            type="button"
            [class.picked]="row === index()"
            (pointerenter)="pick(row)"
            (focus)="pick(row)"
            (click)="take(row)"
          >
            @if (item.icon) {
              <mat-icon aria-hidden="true">{{ item.icon }}</mat-icon>
            }
            <span>{{ item.label }}</span>
          </button>
        </li>
      }
    </ul>
  `,
  styles: `
    ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    button {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      width: 100%;
      min-height: 44px;
      padding: 0.6rem 1.2rem;
      border: 1px solid transparent;
      border-radius: 0.6rem;
      background: var(--hr-card, rgba(255, 255, 255, 0.06));
      color: var(--hr-text, #e7e5e4);
      font: inherit;
      font-size: 1.1rem;
      text-align: left;
      cursor: pointer;
    }
    button.picked {
      border-color: var(--hr-accent, #ffaa00);
      background: var(--hr-glass, rgba(255, 255, 255, 0.12));
    }
    button.picked mat-icon {
      color: var(--hr-accent, #ffaa00);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuList {
  readonly items = input.required<readonly MenuItem[]>();
  readonly chosen = output<string>();
  readonly cancelled = output<void>();
  readonly index = signal(0);

  constructor() {
    inject(MenuNavigation).watch((gesture: MenuGesture) => {
      this.moved(gesture);
    });
  }

  /** Picks the row, as a pointer moving over it or a focus landing on it does. */
  pick(row: number): void {
    this.index.set(row);
  }

  /** Picks the row and answers with its id, as a click on it does. */
  take(row: number): void {
    const item = this.items()[row];
    if (!item) return;
    this.pick(row);
    this.chosen.emit(item.id);
  }

  private moved(gesture: MenuGesture): void {
    if (gesture.y !== 0) this.pick(this.wrapped(this.index() + gesture.y));
    if (gesture.confirm) this.take(this.index());
    if (gesture.back) this.cancelled.emit();
  }

  private wrapped(row: number): number {
    const count = this.items().length;
    return count === 0 ? 0 : ((row % count) + count) % count;
  }
}
