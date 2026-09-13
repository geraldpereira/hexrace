import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { PerfCorner } from '@hexrace/hud';

/** The application: one router outlet, the routes decide what is in it, and the fps corner over all. */
@Component({
  selector: 'hr-app',
  imports: [RouterOutlet, PerfCorner],
  template: '<router-outlet /><hr-perf-corner />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
