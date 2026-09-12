import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** A value as a bar: a signed one (-1 to 1) grows from the middle, the others (0 to 1) from the left. */
@Component({
  selector: 'hr-bar',
  template: `
    <div class="track" [class.signed]="signed()">
      <div class="fill" [style.left.%]="left()" [style.width.%]="width()"></div>
    </div>
    <span>{{ value().toFixed(2) }}</span>
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .track {
      position: relative;
      flex: 1;
      height: 0.6rem;
      background: #1e262f;
      border-radius: 0.3rem;
      overflow: hidden;
    }
    .track.signed::after {
      content: '';
      position: absolute;
      left: 50%;
      top: 0;
      bottom: 0;
      width: 1px;
      background: #4a5560;
    }
    .fill {
      position: absolute;
      top: 0;
      bottom: 0;
      background: #ffaa00;
    }
    span {
      width: 3rem;
      text-align: right;
      font-variant-numeric: tabular-nums;
      font-size: 0.85rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Bar {
  readonly value = input.required<number>();
  readonly signed = input(false);
  readonly left = computed(() => (this.signed() ? 50 + Math.min(this.value(), 0) * 50 : 0));
  readonly width = computed(() => Math.abs(this.value()) * (this.signed() ? 50 : 100));
}
