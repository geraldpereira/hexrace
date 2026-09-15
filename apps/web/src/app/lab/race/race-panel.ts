import { Injectable, inject } from '@angular/core';
import { CameraTuning } from '@hexrace/camera';
import { FallWatch } from '@hexrace/game-commons';
import { type DebugFolder } from '@hexrace/hud';
import { TRACK_MODES, TrackExamples } from '@hexrace/track';

import { type RaceBench } from '@ui/lab/race/race-bench';
import { GeneratorPanel } from '@ui/lab/track/generator-panel';

type Knob = ReturnType<DebugFolder['add']>;

const MAX_TIME_MS = 600_000;
const MAX_POSITION = 200;

/**
 * The debug folder of the race showcase: where the track comes from, what the race asks, the tile
 * window and what puts the car back, then the read-only dials of the race in flight. The car's own
 * knobs are not repeated here: `lab/car` is their bench, and the two pages share the same services.
 */
@Injectable({ providedIn: 'root' })
export class RacePanel {
  private readonly examples = inject(TrackExamples);
  private readonly fall = inject(FallWatch);
  private readonly generators = inject(GeneratorPanel);
  private readonly tuning = inject(CameraTuning);
  private rules: Knob[] = [];

  build(folder: DebugFolder, bench: RaceBench): void {
    this.track(folder.addFolder('Track'), bench);
    this.race(folder.addFolder('Race'), bench);
    this.world(folder.addFolder('World'), bench);
    this.readouts(folder.addFolder('Readouts'), bench);
  }

  /** Puts what the track just loaded says about the race back on the knobs that show it. */
  onTrackLoaded(): void {
    for (const knob of this.rules) knob.updateDisplay();
  }

  private track(folder: DebugFolder, bench: RaceBench): void {
    folder
      .add(bench.draft, 'example', this.examples.ids())
      .name('Example')
      .onChange(() => {
        bench.draft.source = 'example';
        bench.rebuild();
      });
    this.generators.build(folder.addFolder('Generator'), bench.draft, () => {
      bench.draft.source = 'generated';
      bench.rebuild();
    });
  }

  private race(folder: DebugFolder, bench: RaceBench): void {
    const again = (): void => {
      bench.restart();
    };
    this.rules = [
      folder
        .add(bench.settings, 'mode', [...TRACK_MODES])
        .name('Mode')
        .onChange(again),
      folder.add(bench.settings, 'laps', 1, 9, 1).name('Laps').onChange(again),
    ];
    folder.add({ restart: () => bench.restart() }, 'restart').name('Restart');
    folder.add({ sound: () => bench.startSound() }, 'sound').name('Start sound');
    folder.add({ clear: () => bench.clearBest() }, 'clear').name('Clear best time');
  }

  private world(folder: DebugFolder, bench: RaceBench): void {
    folder.add(bench.race.stage, 'ahead', 0, 12, 1).name('Tiles ahead');
    folder.add(bench.race.stage, 'behind', 0, 12, 1).name('Tiles behind');
    const again = (): void => {
      bench.rebuild();
    };
    folder.add(bench.race.stage, 'smooth').name('Smooth shading').onChange(again);
    folder.add(bench.race.stage, 'roughness').name('Swell relief').onChange(again);
    folder.add(bench.race.director, 'wrongWaySpeed', 0, 20, 0.5).name('Wrong way above (m/s)');
    folder.add(this.fall, 'margin', 0, 20, 0.5).name('Fall margin (m)');
    folder.add(this.tuning, 'anticipation', 0, 1, 0.05).name('Camera anticipation');
  }

  private readouts(folder: DebugFolder, bench: RaceBench): void {
    const state = bench.race.director.state;
    folder.add(state, 'phase').name('Phase').listen().disable();
    folder.add(state, 'lap', 0, 9, 1).name('Lap').listen().disable();
    folder.add(state, 'lapCount', 0, 9, 1).name('Laps to run').listen().disable();
    folder.add(state, 'elapsedMs', 0, MAX_TIME_MS, 1).name('Time (ms)').listen().disable();
    folder.add(state, 'position', 0, MAX_POSITION, 0.01).name('Position').listen().disable();
    folder.add(bench, 'tile', 0, MAX_POSITION, 1).name('Tile').listen().disable();
    folder.add(state, 'wrongWay').name('Wrong way').listen().disable();
    folder.add(bench, 'best').name('Best time').listen().disable();
  }
}
