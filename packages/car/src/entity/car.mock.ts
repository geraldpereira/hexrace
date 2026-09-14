import { type CarOptions } from '@car/entity/car-options';
import { type CarSpec } from '@car/entity/car-spec';
import { type WheelContact } from '@car/entity/car-readout';
import { DEFAULT_CAR_OPTIONS, DEFAULT_CAR_SPEC } from '@car/entity/car-defaults';
import { FIRM } from '@car/entity/surfaces/sealed-feels';

export function carSpec(): CarSpec {
  return structuredClone(DEFAULT_CAR_SPEC);
}

export function carOptions(): CarOptions {
  return structuredClone(DEFAULT_CAR_OPTIONS);
}

export function wheelContact(overrides: Partial<WheelContact> = {}): WheelContact {
  return {
    contact: true,
    surface: FIRM,
    longitudinalSlip: 0,
    lateralSlipDeg: 0,
    slipSpeed: 0,
    suspensionVelocity: 0,
    hardHit: false,
    width: 0.22,
    bump: 0,
    point: { x: 0, y: 0, z: 0 },
    normal: { x: 0, y: 1, z: 0 },
    lateral: { x: 1, y: 0, z: 0 },
    longitudinal: { x: 0, y: 0, z: 1 },
    ...overrides,
  };
}
