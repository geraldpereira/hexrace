import { TestBed } from '@angular/core/testing';

import { Drivetrain } from '@car/drive/drivetrain';
import { carSpec } from '@car/entity/car.mock';

describe('Drivetrain', () => {
  let drivetrain: Drivetrain;

  beforeEach(() => {
    drivetrain = TestBed.inject(Drivetrain);
  });

  it('steps from reverse to the top gear and no further', () => {
    const top = drivetrain.topGear(carSpec().gearbox.ratios);
    expect(top).toBe(5);
    expect(drivetrain.stepGear(0, true, false, top)).toBe(1);
    expect(drivetrain.stepGear(0, false, true, top)).toBe(-1);
    expect(drivetrain.stepGear(-1, false, true, top)).toBe(-1);
    expect(drivetrain.stepGear(5, true, false, top)).toBe(5);
    expect(drivetrain.stepGear(3, true, true, top)).toBe(3);
  });

  it('keeps the clutch open through the switch, then lets it in', () => {
    expect(drivetrain.manualClutch(2, 0.1, 0.25, 0.2)).toBe(0);
    expect(drivetrain.manualClutch(2, 0.35, 0.25, 0.2)).toBeCloseTo(0.5);
    expect(drivetrain.manualClutch(2, 5, 0.25, 0.2)).toBe(1);
    expect(drivetrain.manualClutch(2, 0.3, 0.25, 0)).toBe(1);
    expect(drivetrain.manualClutch(0, 5, 0.25, 0.2)).toBe(0);
  });

  it('reads the revs a gear and a wheel speed imply', () => {
    const box = carSpec().gearbox;
    expect(drivetrain.engineRpm(box.ratios, box.reverseRatio, 0, 100)).toBe(0);
    expect(drivetrain.engineRpm(box.ratios, box.reverseRatio, 1, 10)).toBeCloseTo(305.577, 2);
    expect(drivetrain.engineRpm(box.ratios, box.reverseRatio, -1, 10)).toBeCloseTo(305.577, 2);
    expect(drivetrain.engineRpm(box.ratios, box.reverseRatio, 9, 10)).toBe(0);
  });
});
