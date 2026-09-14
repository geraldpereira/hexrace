import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { type CarSpec } from '@hexrace/car';
import { GearIndicator, RevCounter, SpeedIndicator } from '@hexrace/hud';

import { type CarDash } from '@ui/lab/car/car-dash';

/** The rev counter, the gear and the speed of a driving page, in one corner of the canvas. */
@Component({
  selector: 'hr-car-gauges',
  imports: [RevCounter, GearIndicator, SpeedIndicator],
  template: `
    <hr-rev-counter
      [rpm]="dash().rpm()"
      [maxRpm]="spec().engine.maxRpm"
      [redlineRpm]="spec().gearbox.shiftUpRpm"
      [limiter]="dash().limiter()"
    />
    <hr-gear-indicator [gear]="dash().gear()" [shiftHint]="dash().shiftHint()" />
    <hr-speed-indicator [kmh]="dash().kmh()" />
  `,
  styles: `
    :host {
      display: flex;
      align-items: flex-end;
      gap: 1rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarGauges {
  readonly dash = input.required<CarDash>();
  readonly spec = input.required<CarSpec>();
}
