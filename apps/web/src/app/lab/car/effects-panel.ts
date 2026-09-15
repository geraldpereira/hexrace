import { Injectable, inject } from '@angular/core';
import { type SurfaceFeel, Surfaces } from '@hexrace/car';
import { type DebugFolder } from '@hexrace/hud';
import { type EnvironmentId, ENVIRONMENT_IDS } from '@hexrace/tile';

import { type CarBench } from '@ui/lab/car/car-bench';

/**
 * The half of the bench that is not the car: the sound, which a browser only lets start on a
 * gesture and which therefore has its own switch, the marks and the dust with the thresholds they
 * share, and the two test obstacles. The per-surface knobs are the ones POC 1 left to be dosed
 * while driving, so they sit one folder per rank of the palette, pushed into the worklets live.
 * The swell belongs to a rank of an environment, not to a feel two zones share: its own folder.
 */
@Injectable({ providedIn: 'root' })
export class EffectsPanel {
  private readonly surfaces = inject(Surfaces);

  build(folder: DebugFolder, bench: CarBench): void {
    this.sound(folder, bench);
    this.swells(folder);
    this.marks(folder, bench);
    this.dust(folder, bench);
    this.obstacles(folder, bench);
  }

  private sound(folder: DebugFolder, bench: CarBench): void {
    const f = folder.addFolder('Sound');
    f.add({ start: () => bench.startSound() }, 'start').name('Start sound');
    const engine = f.addFolder('Engine');
    engine.add(bench.engineSound, 'enabled').name('Enabled');
    engine.add(bench.engineSound, 'volume', 0, 1, 0.05).name('Volume');
    const tune = (): void => {
      bench.engineSound.tune();
    };
    engine.add(bench.engineSound, 'cylinders', 1, 12, 1).name('Cylinders').onChange(tune);
    engine.add(bench.engineSound, 'exhaustHz', 40, 400, 5).name('Exhaust pipe (Hz)').onChange(tune);
    engine.add(bench.engineSound, 'drive', 0.5, 5, 0.1).name('Drive').onChange(tune);
    engine.add(bench.engineSound, 'unevenness', 0, 1, 0.05).name('Unevenness').onChange(tune);
    engine.add(bench.engineSound, 'overrunRate', 0, 8, 0.5).name('Overrun crackle (/s)');
    engine.add({ pop: () => bench.engineSound.testPops() }, 'pop').name('Test pops');
    const tyre = f.addFolder('Tyres');
    tyre.add(bench.tyreSound, 'enabled').name('Enabled');
    tyre.add(bench.tyreSound, 'volume', 0, 1, 0.05).name('Volume');
    tyre.add(bench.tyreSound, 'audibleFrom', 0, 0.9, 0.05).name('Audible from');
    const chassis = f.addFolder('Chassis');
    chassis.add(bench.chassisSound, 'enabled').name('Enabled');
    chassis.add(bench.chassisSound, 'volume', 0, 1, 0.05).name('Volume');
    chassis
      .add(bench.chassisSound, 'windLevel', 0, 2, 0.05)
      .name('Wind level')
      .onChange(() => {
        bench.chassisSound.tuneWind();
      });
    chassis.add(bench.chassisSound, 'thumpLevel', 0, 2, 0.05).name('Suspension level');
    chassis.add({ hit: () => bench.chassisSound.testHit() }, 'hit').name('Test hard hit');
    this.perSurface(f.addFolder('Per surface'), bench);
  }

  private perSurface(f: DebugFolder, bench: CarBench): void {
    for (const [i, feel] of bench.palette.entries()) {
      const sf = f.addFolder(feel.key);
      sf.close();
      const slide = (): void => {
        bench.tyreSound.tune(i);
      };
      sf.add(feel.slideSound, 'tone', 0, 1, 0.05).name('Slide tone').onChange(slide);
      sf.add(feel.slideSound, 'freq', 100, 4000, 10).name('Slide frequency (Hz)').onChange(slide);
      sf.add(feel.slideSound, 'level', 0, 2, 0.05).name('Slide level').onChange(slide);
      const roll = (): void => {
        bench.chassisSound.tune(i);
      };
      sf.add(feel.rollSound, 'hiss', 0, 2, 0.05).name('Roll roar').onChange(roll);
      sf.add(feel.rollSound, 'rumble', 0, 2, 0.05).name('Roll rumble').onChange(roll);
      this.surfaceDrive(sf, feel);
    }
  }

  private surfaceDrive(sf: DebugFolder, feel: SurfaceFeel): void {
    sf.add(feel, 'rolling', 0, 10, 0.05).name('Rolling resistance');
    sf.add(feel, 'drag', 0, 500, 5).name('Drag (N per m/s)');
    sf.add(feel, 'bumpHeight', 0, 0.15, 0.005).name('Bump height (m)');
    sf.add(feel, 'lateralRoughness', 0, 2, 0.05).name('Lateral roughness');
    sf.add(feel, 'wavelength', 0.1, 5, 0.1).name('Grain wavelength (m)');
  }

  private swells(folder: DebugFolder): void {
    const f = folder.addFolder('Swell');
    f.close();
    for (const id of ENVIRONMENT_IDS) this.environmentSwells(f, id);
  }

  private environmentSwells(folder: DebugFolder, id: EnvironmentId): void {
    const f = folder.addFolder(id);
    f.close();
    for (const query of this.surfaces.of(id)) {
      const swell = this.surfaces.swell(query);
      const name = `${query.zone} ${String(query.rank)}`;
      f.add(swell, 'height', 0, 0.3, 0.005).name(`${name} height (m)`);
      f.add(swell, 'length', 2, 20, 0.5).name(`${name} step (m)`);
    }
  }

  private marks(folder: DebugFolder, bench: CarBench): void {
    const f = folder.addFolder('Skid marks');
    f.add(bench.marks, 'enabled').name('Enabled');
    f.add(bench.marks, 'lockSlipStart', 0.05, 1, 0.05).name('Lock slip start');
    f.add(bench.marks, 'lockSlipFull', 0.1, 1.5, 0.05).name('Lock slip full');
    f.add(bench.marks, 'slipSpeedStart', 0, 5, 0.1).name('Scrub start (m/s)');
    f.add(bench.marks, 'slipSpeedFull', 0.2, 10, 0.1).name('Scrub full (m/s)');
    f.add(bench.marks, 'horizon', 0, 400, 10).name('Horizon (m)');
    f.add(bench.marks, 'attack', 0, 0.5, 0.01).name('Attack (s)');
    f.add(bench.marks, 'release', 0, 1, 0.01).name('Release (s)');
    f.add(bench.marks, 'lateralEnabled').name('Sideways too');
    f.add(bench.marks, 'widthScale', 0.3, 2, 0.1).name('Width scale');
    f.add(bench.marks, 'segments').name('Segments').listen().disable();
    f.add({ clear: () => bench.marks.clear() }, 'clear').name('Clear');
  }

  private dust(folder: DebugFolder, bench: CarBench): void {
    const f = folder.addFolder('Particles');
    f.add(bench.particles, 'enabled').name('Enabled');
    f.add(bench.particles, 'slideRate', 0, 3, 0.1).name('Slide rate ×');
    f.add(bench.particles, 'rollRate', 0, 3, 0.1).name('Roll rate ×');
    f.add(bench.particles, 'alive').name('Alive').listen().disable();
  }

  private obstacles(folder: DebugFolder, bench: CarBench): void {
    const f = folder.addFolder('Obstacles');
    const again = (): void => {
      bench.rebuildObstacles();
    };
    f.add(bench.obstacles, 'ramp').name('Ramp').onChange(again);
    f.add(bench.obstacles, 'rampLength', 2, 15, 0.5).name('Ramp length (m)').onFinishChange(again);
    f.add(bench.obstacles, 'rampHeight', 0.2, 3, 0.1).name('Ramp height (m)').onFinishChange(again);
    f.add(bench.obstacles, 'rampZ', 20, 200, 1).name('Ramp at (m)').onFinishChange(again);
    f.add(bench.obstacles, 'bump').name('Speed bump').onChange(again);
    f.add(bench.obstacles, 'bumpRadius', 0.1, 1, 0.05)
      .name('Bump radius (m)')
      .onFinishChange(again);
    f.add(bench.obstacles, 'bumpHeight', 0.05, 0.6, 0.01)
      .name('Bump height (m)')
      .onFinishChange(again);
    f.add(bench.obstacles, 'bumpZ', 10, 200, 1).name('Bump at (m)').onFinishChange(again);
  }
}
