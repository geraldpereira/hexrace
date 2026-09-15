import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { type CarSpec } from '@hexrace/car';
import { AssistLamps, Countdown, RaceTimer, ResetGauge, WrongWay } from '@hexrace/hud';

import { type CarDash } from '@ui/scene/car-dash';
import { CarGauges } from '@ui/scene/car-gauges';
import { type RaceReadout } from '@ui/scene/race-readout';

/**
 * Everything a race hangs over its canvas (functional spec 7.2), in the corners the game and the
 * showcase both use: the dashboard bottom left, the timer, the wrong way, the assist lamps and
 * the reset ring top right, the countdown across the middle. It takes no pointer and reads two
 * plain objects a page fills each frame, so nothing here waits on change detection.
 */
@Component({
  selector: 'hr-race-hud',
  imports: [CarGauges, AssistLamps, Countdown, RaceTimer, WrongWay, ResetGauge],
  template: `
    <hr-car-gauges class="corner dashboard" [dash]="dash()" [spec]="spec()" />
    <div class="corner sidebar">
      <hr-race-timer [readout]="readout().timer()" />
      <hr-wrong-way [active]="readout().wrongWay()" />
      <hr-assist-lamps [assists]="dash().assists()" />
      <hr-reset-gauge [progress]="dash().resetProgress()" />
    </div>
    <hr-countdown [step]="readout().countdownStep()" />
  `,
  styles: `
    :host {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    .corner {
      position: absolute;
    }
    .dashboard {
      left: 1rem;
      bottom: 1rem;
    }
    .sidebar {
      right: 1rem;
      top: 1rem;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.6rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RaceHud {
  readonly dash = input.required<CarDash>();
  readonly spec = input.required<CarSpec>();
  readonly readout = input.required<RaceReadout>();
}
