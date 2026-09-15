import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { type MenuGesture, MenuNavigation } from '@hud/menus/menu-navigation';

const DEFAULT_COLUMNS = 3;
const PICKED_CLASS = 'hr-menu-picked';

/**
 * A grid of cards walked with the pad, the keys, the mouse or a finger, for the pick screens of
 * the functional spec 7.1. It projects the cards it is given and knows nothing of them: it rings
 * the current one by putting a class on it from the frame loop, so a `TrackCard` stays a card and
 * never learns that it can be selected. `columns` lays the rows out and is also what up and down
 * step by; the walk stops at both ends, because a grid has corners and a list does not.
 */
@Component({
  selector: 'hr-menu-grid',
  host: {
    '[style.grid-template-columns]': 'template()',
    '(pointerover)': 'over($event)',
    '(click)': 'tap($event)',
  },
  template: '<ng-content />',
  styles: `
    :host {
      display: grid;
      gap: 1rem;
      justify-content: center;
    }
    :host ::ng-deep .hr-menu-picked {
      outline: 2px solid var(--hr-accent, #ffaa00);
      outline-offset: 3px;
      border-radius: 0.7rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuGrid {
  readonly count = input.required<number>();
  readonly columns = input(DEFAULT_COLUMNS);
  readonly chosen = output<number>();
  readonly cancelled = output<void>();
  readonly index = signal(0);
  readonly template = computed(() => `repeat(${String(this.columns())}, max-content)`);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    inject(MenuNavigation).watch((gesture: MenuGesture) => {
      this.moved(gesture);
    });
  }

  /** Picks the cell a pointer moved over, when it moved over one. */
  over(event: Event): void {
    const cell = this.cellAt(event);
    if (cell >= 0) this.index.set(cell);
  }

  /** Picks the cell a click landed in and answers with it. */
  tap(event: Event): void {
    const cell = this.cellAt(event);
    if (cell < 0) return;
    this.index.set(cell);
    this.chosen.emit(cell);
  }

  private moved(gesture: MenuGesture): void {
    this.walk(gesture.x + gesture.y * this.columns());
    if (gesture.confirm && this.count() > 0) this.chosen.emit(this.index());
    if (gesture.back) this.cancelled.emit();
    this.paint();
  }

  private walk(step: number): void {
    const last = this.count() - 1;
    if (step === 0 || last < 0) return;
    this.index.set(Math.min(Math.max(this.index() + step, 0), last));
  }

  private paint(): void {
    const picked = this.index();
    for (const [cell, element] of [...this.host.nativeElement.children].entries()) {
      element.classList.toggle(PICKED_CLASS, cell === picked);
    }
  }

  private cellAt(event: Event): number {
    const target = event.target as Node | null;
    return [...this.host.nativeElement.children].findIndex((cell: Element) =>
      cell.contains(target),
    );
  }
}
