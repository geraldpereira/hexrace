/**
 * Where the manual gearbox of the debug option stands: the gear the driver asked for, how long
 * ago in seconds, and the two bumpers as they were last step so a press is an edge and not a
 * hold. Jolt's automatic box keeps none of this; in manual mode nothing but this drives it.
 */
export interface GearboxState {
  gear: number;
  age: number;
  wasUp: boolean;
  wasDown: boolean;
}

/** Neutral, nothing pressed, no shift in living memory. */
export const IDLE_GEARBOX: Readonly<GearboxState> = {
  gear: 0,
  age: Number.POSITIVE_INFINITY,
  wasUp: false,
  wasDown: false,
};
