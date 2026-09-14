import { type CarPose, type CarReadout, type WheelContact } from '@car/entity/car-readout';
import { type CarState, IDLE_CAR_STATE } from '@car/entity/car-state';
import { wheelContact } from '@car/entity/car.mock';

export interface FakeReadout extends CarReadout {
  state: CarState;
  contacts: WheelContact[];
  pose: CarPose;
  velocity: { x: number; y: number; z: number };
}

export function fakeReadout(wheels = 4): FakeReadout {
  return {
    state: { ...IDLE_CAR_STATE },
    contacts: Array.from({ length: wheels }, () => wheelContact()),
    pose: {
      position: { x: 0, y: 0.5, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      wheels: Array.from({ length: wheels }, () => ({
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
      })),
    },
    velocity: { x: 0, y: 0, z: 0 },
  };
}
