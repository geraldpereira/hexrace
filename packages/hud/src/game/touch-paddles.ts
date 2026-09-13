import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';

import { startFrameLoop } from '@hud/debug/frame-loop';
import { type TouchPaddle, type TouchSource } from '@hexrace/inputs';

const KNOB_PX = 56;

/**
 * Draws the touch zones and the paddles of a `TouchSource`: three faint zones, and for each
 * finger down a ring at its origin and a knob at its deflection. Reads the source every frame;
 * it never listens to pointers itself, the source does.
 */
@Component({
  selector: 'hr-touch-paddles',
  template: `
    <div class="zone drive"></div>
    <div class="zone steer"></div>
    <div class="zone hand-brake" [class.active]="paddles()[2]?.active"></div>
    @for (paddle of paddles(); track paddle.zone) {
      @if (paddle.active && paddle.zone !== 'handBrake') {
        <div
          class="ring"
          [style.left.px]="paddle.originX"
          [style.top.px]="paddle.originY"
          [style.width.px]="ringPx()"
          [style.height.px]="ringPx()"
        ></div>
        <div class="knob" [style.left.px]="knobX(paddle)" [style.top.px]="knobY(paddle)"></div>
      }
    }
  `,
  styles: `
    :host {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 10;
    }
    .zone {
      position: absolute;
      border: 1px dashed rgba(255, 255, 255, 0.15);
    }
    .drive {
      left: 0;
      top: 0;
      bottom: 0;
      width: 40%;
    }
    .steer {
      right: 0;
      top: 0;
      bottom: 0;
      width: 40%;
    }
    .hand-brake {
      left: 40%;
      right: 40%;
      top: 55%;
      bottom: 0;
      border-radius: 1rem 1rem 0 0;
      background: rgba(255, 170, 0, 0.08);
    }
    .hand-brake.active {
      background: rgba(255, 170, 0, 0.35);
    }
    .ring,
    .knob {
      position: absolute;
      transform: translate(-50%, -50%);
      border-radius: 50%;
    }
    .ring {
      border: 2px solid rgba(255, 255, 255, 0.4);
    }
    .knob {
      width: 56px;
      height: 56px;
      background: rgba(255, 170, 0, 0.8);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TouchPaddles {
  readonly source = input.required<TouchSource>();
  readonly paddles = signal<readonly TouchPaddle[]>([]);
  /** The ring spans the full travel either side of the origin, plus the knob's own radius. */
  readonly ringPx = signal(0);

  constructor() {
    startFrameLoop(this.tick);
  }

  knobX(p: TouchPaddle): number {
    return p.zone === 'steer' ? p.originX + p.deflection * this.source().travelPx : p.originX;
  }

  knobY(p: TouchPaddle): number {
    return p.zone === 'drive' ? p.originY + p.deflection * this.source().travelPx : p.originY;
  }

  private readonly tick = (): void => {
    this.paddles.set(this.source().paddles.map((p) => ({ ...p })));
    this.ringPx.set(this.source().travelPx * 2 + KNOB_PX);
  };
}
