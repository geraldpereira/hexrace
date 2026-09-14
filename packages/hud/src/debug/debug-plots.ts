import { Injectable } from '@angular/core';
import { type GUI } from 'lil-gui';

import { DebugPlot, type PlotOptions } from '@hud/debug/debug-plot';

/** Mounts rolling plots as rows of a lil-gui folder. */
@Injectable({ providedIn: 'root' })
export class DebugPlots {
  add(folder: GUI, options: PlotOptions): DebugPlot {
    const plot = new DebugPlot(options);
    folder.$children.appendChild(plot.element);
    return plot;
  }
}
