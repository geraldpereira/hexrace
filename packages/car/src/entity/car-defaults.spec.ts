import { DEFAULT_CAR_OPTIONS, DEFAULT_CAR_SPEC } from '@car/entity/car-defaults';
import { IDLE_CAR_STATE } from '@car/entity/car-state';
import { SURFACE_CATALOG } from '@car/entity/surfaces/surface-catalog';

describe('the car data', () => {
  it('carries the POC figures the user tuned', () => {
    expect(DEFAULT_CAR_SPEC.chassis.mass).toBe(1300);
    expect(DEFAULT_CAR_SPEC.chassis.comY).toBe(-0.3);
    expect(DEFAULT_CAR_SPEC.steering.maxAtRestDeg).toBe(32);
    expect(DEFAULT_CAR_SPEC.steering.maxAtSpeedDeg).toBe(12);
    expect(DEFAULT_CAR_SPEC.gearbox.ratios).toHaveLength(5);
    expect(DEFAULT_CAR_SPEC.handBrakeLateralGrip).toBe(0.3);
    expect(DEFAULT_CAR_SPEC.transmission).toBe('all');
  });

  it('leaves the garage with every assist off', () => {
    expect(DEFAULT_CAR_OPTIONS.abs.enabled).toBe(false);
    expect(DEFAULT_CAR_OPTIONS.tractionControl.enabled).toBe(false);
    expect(DEFAULT_CAR_OPTIONS.wing.enabled).toBe(false);
    expect(DEFAULT_CAR_OPTIONS.yawDamping.enabled).toBe(false);
    expect(IDLE_CAR_STATE.gear).toBe(0);
    expect(IDLE_CAR_STATE.airborne).toBe(true);
  });

  it('gives every environment eight ranks ordered by falling grip', () => {
    for (const feels of Object.values(SURFACE_CATALOG)) {
      const zones = [feels.road, feels.shoulder, feels.landscape];
      expect(zones.flat()).toHaveLength(8);
      for (const ranks of [feels.road, feels.shoulder]) {
        const peaks = ranks.map((feel) => Math.max(...feel.longitudinal.map((p) => p.y)));
        expect(peaks[0]).toBeGreaterThanOrEqual(peaks[1]!);
        expect(peaks[1]).toBeGreaterThanOrEqual(peaks[2]!);
      }
    }
  });
});
