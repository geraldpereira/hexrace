import { Injectable, inject } from '@angular/core';
import { type SlipAssist, Surfaces } from '@hexrace/car';
import { type DebugFolder } from '@hexrace/hud';
import { EnvironmentCatalog, type EnvironmentId } from '@hexrace/tile';

import { type CarBench } from '@ui/lab/car/car-bench';
import { EffectsPanel } from '@ui/lab/car/effects-panel';

const WHEELS = ['Front left', 'Front right', 'Back left', 'Back right'];

/**
 * The bench of the car showcase, in the lil-gui panel: what a model is (mass and balance, engine,
 * gearbox, steering), what the garage sells (ABS, traction control, wing, and the touch assist),
 * and the ground it is being driven on. Anything Jolt reads only when a body is built is applied
 * on release, not on every pixel of a slider, so dragging one does not rebuild the car sixty times.
 */
@Injectable({ providedIn: 'root' })
export class CarPanel {
  private readonly environments = inject(EnvironmentCatalog);
  private readonly surfaces = inject(Surfaces);
  private readonly effects = inject(EffectsPanel);

  build(folder: DebugFolder, bench: CarBench): void {
    const car = bench.car;
    folder.add(car.state, 'speedKmh', 0, 300, 0.1).name('Speed (km/h)').listen().disable();
    folder.add(car.state, 'rpm', 0, 12000, 1).name('Engine (RPM)').listen().disable();
    folder.add(car.state, 'gear', -1, 9, 1).name('Gear').listen().disable();
    folder.add(car, 'grain').name('Surface grain');
    folder.add({ reset: () => bench.car.reset() }, 'reset').name('Reset car');
    folder.add({ crate: () => bench.drop() }, 'crate').name('Drop a crate');
    this.ground(folder, bench);
    this.balance(folder, bench);
    this.engine(folder, bench);
    this.gearbox(folder, bench);
    this.steering(folder, bench);
    this.garage(folder, bench);
    this.effects.build(folder, bench);
  }

  private ground(folder: DebugFolder, bench: CarBench): void {
    const f = folder.addFolder('Ground');
    const ids = Object.fromEntries(
      this.environments.ids.map((id: EnvironmentId) => [this.environments.of(id).name, id]),
    );
    f.add(bench, 'environment', ids)
      .name('Environment')
      .onChange(() => {
        bench.rebuildGround();
      });
    for (const [i, query] of this.surfaces.of(bench.environment).entries()) {
      const feel = { under: `${query.zone} ${String(query.rank)}` };
      f.add(feel, 'under')
        .name(`Lane ${String(i + 1)}`)
        .disable();
    }
    for (const [i, name] of WHEELS.entries()) {
      const row = {
        get on(): string {
          return bench.car.contacts[i]!.surface.key;
        },
      };
      f.add(row, 'on').name(`${name} on`).listen().disable();
    }
  }

  private balance(folder: DebugFolder, bench: CarBench): void {
    const f = folder.addFolder('Mass & balance');
    const chassis = bench.spec.chassis;
    const again = (): void => {
      bench.rebuildCar();
    };
    f.add(chassis, 'mass', 500, 3000, 10).name('Mass (kg)').onFinishChange(again);
    f.add(chassis, 'comX', -0.5, 0.5, 0.01).name('CoM left/right (m)').onFinishChange(again);
    f.add(chassis, 'comY', -0.8, 0.5, 0.01).name('CoM height (m)').onFinishChange(again);
    f.add(chassis, 'comZ', -1.5, 1.5, 0.05).name('CoM front(+)/rear(-) (m)').onFinishChange(again);
    f.add(bench.view, 'showCentreOfMass').name('Show CoM');
  }

  private engine(folder: DebugFolder, bench: CarBench): void {
    const f = folder.addFolder('Engine');
    const engine = bench.spec.engine;
    const again = (): void => {
      bench.rebuildCar();
    };
    f.add(engine, 'maxTorque', 50, 2000, 10).name('Max torque (N·m)').onFinishChange(again);
    f.add(engine, 'minRpm', 500, 3000, 50).name('Idle (RPM)').onFinishChange(again);
    f.add(engine, 'maxRpm', 3000, 12000, 100).name('Max (RPM)').onFinishChange(again);
    f.add(engine, 'inertia', 0.05, 5, 0.05).name('Inertia (kg·m²)').onFinishChange(again);
    f.add(engine, 'angularDamping', 0, 2, 0.05).name('Damping').onFinishChange(again);
  }

  private gearbox(folder: DebugFolder, bench: CarBench): void {
    const f = folder.addFolder('Gearbox');
    const box = bench.spec.gearbox;
    const again = (): void => {
      bench.rebuildCar();
    };
    f.add(bench.car, 'manualGearbox').name('Manual (LB / RB)');
    f.add(bench.car.state, 'clutch', 0, 1, 0.01).name('Clutch').listen().disable();
    f.add(box, 'shiftUpRpm', 2000, 12000, 100).name('Shift up (RPM)').onFinishChange(again);
    f.add(box, 'shiftDownRpm', 500, 6000, 100).name('Shift down (RPM)').onFinishChange(again);
    f.add(box, 'switchTime', 0, 1.5, 0.05).name('Switch (s)').onFinishChange(again);
    f.add(box, 'clutchReleaseTime', 0, 1.5, 0.05).name('Clutch release (s)').onFinishChange(again);
    f.add(box, 'switchLatency', 0, 2, 0.05).name('Latency (s)').onFinishChange(again);
    f.add(box, 'clutchStrength', 0.5, 20, 0.5).name('Clutch strength').onFinishChange(again);
    f.add(bench.spec, 'transmission', ['front', 'rear', 'all'])
      .name('Driven wheels')
      .onFinishChange(again);
  }

  private steering(folder: DebugFolder, bench: CarBench): void {
    const f = folder.addFolder('Steering');
    const steering = bench.spec.steering;
    f.add(steering, 'degressive').name('Degressive with speed');
    f.add(steering, 'maxAtRestDeg', 5, 45, 0.5).name('Max at rest (°)');
    f.add(steering, 'maxAtSpeedDeg', 2, 45, 0.5).name('Max at speed (°)');
    f.add(steering, 'fullEffectKmh', 20, 200, 5).name('Full effect at (km/h)');
    f.add(bench.car.state, 'steerMaxDeg', 0, 45, 0.1).name('Current max (°)').listen().disable();
    f.add(steering, 'steerResponse', 0, 1, 0.05).name('Steering (0 lin → 1 cubic)');
    f.add(steering, 'throttleResponse', 0, 1, 0.05).name('Throttle (0 lin → 1 cubic)');
    f.add(steering, 'brakeResponse', 0, 1, 0.05).name('Brake (0 lin → 1 cubic)');
    f.add(bench.spec, 'handBrakeLateralGrip', 0, 1, 0.05).name('Hand brake lat. grip');
  }

  private garage(folder: DebugFolder, bench: CarBench): void {
    const f = folder.addFolder('Garage options');
    const abs = f.addFolder('ABS');
    this.assist(abs, bench.options.abs);
    abs.add(bench.car.state, 'absCut', 0, 1, 0.01).name('Cutting').listen().disable();
    const traction = f.addFolder('Traction control');
    this.assist(traction, bench.options.tractionControl);
    traction.add(bench.car.state, 'tractionCut', 0, 1, 0.01).name('Cutting').listen().disable();
    const wing = f.addFolder('Wing');
    wing.add(bench.options.wing, 'enabled').name('Bought');
    wing.add(bench.options.wing, 'coefficient', 0, 20, 0.5).name('Coefficient (N/(m/s)²)');
    wing.add(bench.options.wing, 'balance', -1, 1, 0.1).name('Balance (-1 rear → 1 front)');
    wing
      .add(bench.car.state, 'downforcePercent', 0, 200, 1)
      .name('Downforce (% weight)')
      .listen()
      .disable();
    const yaw = f.addFolder('Yaw damping (touch)');
    yaw.add(bench.options.yawDamping, 'enabled').name('Enabled');
    yaw.add(bench.options.yawDamping, 'damping', 0, 10, 0.1).name('Damping (1/s)');
    yaw.add(bench.car.state, 'yawRateDeg', -360, 360, 1).name('Yaw rate (°/s)').listen().disable();
  }

  private assist(f: DebugFolder, assist: SlipAssist): void {
    f.add(assist, 'enabled').name('Bought');
    f.add(assist, 'slipThreshold', 0.05, 1, 0.01).name('Slip threshold');
    f.add(assist, 'slipRange', 0.05, 1, 0.01).name('Slip range');
    f.add(assist, 'strength', 0, 1, 0.05).name('Strength');
    f.add(assist, 'minSpeedKmh', 0, 30, 1).name('Active above (km/h)');
    f.add(assist, 'releaseTime', 0, 0.5, 0.01).name('Release time (s)');
  }
}
