import { CameraTuning } from '@camera/entity/camera-tuning';
import { headingTo, solveRig, turnBetween } from '@camera/entity/rig';

const ORIGIN = { x: 0, y: 0, z: 0 };

describe('turnBetween', () => {
  it.each([
    [0, 1, 1],
    [1, 0, -1],
    [0, Math.PI, Math.PI],
    [0, -Math.PI, Math.PI],
    [0.1, -0.1 + 2 * Math.PI, -0.2],
    [-3, 3, -0.2831853],
  ])('turns from %d to %d by the shortest arc, %d', (from, to, expected) => {
    expect(turnBetween(from, to)).toBeCloseTo(expected, 5);
  });
});

describe('headingTo', () => {
  it('reads 0 along +Z and a quarter turn towards +X', () => {
    expect(headingTo(ORIGIN, { x: 0, y: 0, z: 5 })).toBe(0);
    expect(headingTo(ORIGIN, { x: 5, y: 0, z: 0 })).toBeCloseTo(Math.PI / 2);
    expect(headingTo({ x: 1, y: 2, z: 3 }, { x: 1, y: 9, z: 4 })).toBe(0);
  });
});

describe('solveRig', () => {
  let tuning: CameraTuning;

  beforeEach(() => {
    tuning = new CameraTuning();
    tuning.distance = 10;
    tuning.heightAtRest = 4;
    tuning.heightAtSpeed = 12;
    tuning.speedForFullHeight = 40;
    tuning.lookAhead = 5;
  });

  it('sits behind a target at rest, at the rest height, aiming ahead', () => {
    const pose = solveRig({ position: ORIGIN, heading: 0, speed: 0, nextTile: null }, tuning);
    expect(pose.heading).toBe(0);
    expect(pose.eye).toEqual({ x: 0, y: 4, z: -10 });
    expect(pose.aim).toEqual({ x: 0, y: 0, z: 5 });
  });

  it('follows the heading and rises with speed, capped at the full height', () => {
    const target = { position: { x: 1, y: 2, z: 3 }, heading: Math.PI / 2, speed: 20 };
    const pose = solveRig({ ...target, nextTile: null }, tuning);
    expect(pose.eye.x).toBeCloseTo(-9);
    expect(pose.eye.y).toBe(10);
    expect(pose.eye.z).toBeCloseTo(3);
    expect(pose.aim.x).toBeCloseTo(6);
    expect(solveRig({ ...target, speed: 80, nextTile: null }, tuning).eye.y).toBe(14);
  });

  it('leans towards the next tile by the anticipation, no further than the cap', () => {
    const toTheRight = { x: 100, y: 0, z: 0 };
    const target = { position: ORIGIN, heading: 0, speed: 0, nextTile: toTheRight };
    tuning.anticipation = 0.5;
    expect(solveRig(target, tuning).heading).toBeCloseTo(Math.PI / 4);
    tuning.anticipation = 1;
    tuning.anticipationMaxDeg = 30;
    expect(solveRig(target, tuning).heading).toBeCloseTo(Math.PI / 6);
    expect(solveRig({ ...target, nextTile: { x: -100, y: 0, z: 0 } }, tuning).heading).toBeCloseTo(
      -Math.PI / 6,
    );
    tuning.anticipation = 0;
    expect(solveRig(target, tuning).heading).toBe(0);
  });
});
