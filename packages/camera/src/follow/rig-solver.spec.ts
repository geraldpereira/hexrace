import { TestBed } from '@angular/core/testing';

import { CameraTuning } from '@camera/follow/camera-tuning';
import { RigSolver } from '@camera/follow/rig-solver';

const ORIGIN = { x: 0, y: 0, z: 0 };

describe('RigSolver', () => {
  let solver: RigSolver;
  let tuning: CameraTuning;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    solver = TestBed.inject(RigSolver);
    tuning = new CameraTuning();
    tuning.distance = 10;
    tuning.heightAtRest = 4;
    tuning.heightAtSpeed = 12;
    tuning.speedForFullHeight = 40;
    tuning.lookAhead = 5;
  });

  it.each([
    [0, 1, 1],
    [1, 0, -1],
    [0, Math.PI, Math.PI],
    [0, -Math.PI, Math.PI],
    [0.1, -0.1 + 2 * Math.PI, -0.2],
    [-3, 3, -0.2831853],
  ])('turns from %d to %d by the shortest arc, %d', (from, to, expected) => {
    expect(solver.turnBetween(from, to)).toBeCloseTo(expected, 5);
  });

  it('reads a heading of 0 along +Z and a quarter turn towards +X', () => {
    expect(solver.headingTo(ORIGIN, { x: 0, y: 0, z: 5 })).toBe(0);
    expect(solver.headingTo(ORIGIN, { x: 5, y: 0, z: 0 })).toBeCloseTo(Math.PI / 2);
    expect(solver.headingTo({ x: 1, y: 2, z: 3 }, { x: 1, y: 9, z: 4 })).toBe(0);
  });

  it('sits behind a target at rest, at the rest height, aiming ahead', () => {
    const pose = solver.solve({ position: ORIGIN, heading: 0, speed: 0, nextTile: null }, tuning);
    expect(pose.heading).toBe(0);
    expect(pose.eye).toEqual({ x: 0, y: 4, z: -10 });
    expect(pose.aim).toEqual({ x: 0, y: 0, z: 5 });
  });

  it('follows the heading and rises with speed, capped at the full height', () => {
    const target = { position: { x: 1, y: 2, z: 3 }, heading: Math.PI / 2, speed: 20 };
    const pose = solver.solve({ ...target, nextTile: null }, tuning);
    expect(pose.eye.x).toBeCloseTo(-9);
    expect(pose.eye.y).toBe(10);
    expect(pose.eye.z).toBeCloseTo(3);
    expect(pose.aim.x).toBeCloseTo(6);
    expect(solver.solve({ ...target, speed: 80, nextTile: null }, tuning).eye.y).toBe(14);
  });

  it('leans towards the next tile by the anticipation, no further than the cap', () => {
    const toTheRight = { x: 100, y: 0, z: 0 };
    const target = { position: ORIGIN, heading: 0, speed: 0, nextTile: toTheRight };
    tuning.anticipation = 0.5;
    expect(solver.solve(target, tuning).heading).toBeCloseTo(Math.PI / 4);
    tuning.anticipation = 1;
    tuning.anticipationMaxDeg = 30;
    expect(solver.solve(target, tuning).heading).toBeCloseTo(Math.PI / 6);
    const toTheLeft = { ...target, nextTile: { x: -100, y: 0, z: 0 } };
    expect(solver.solve(toTheLeft, tuning).heading).toBeCloseTo(-Math.PI / 6);
    tuning.anticipation = 0;
    expect(solver.solve(target, tuning).heading).toBe(0);
  });

  it('slides the heading as the aimed point slides, with no step of its own', () => {
    tuning.anticipation = 1;
    const target = { position: ORIGIN, heading: 0, speed: 0 };
    const near = solver.solve({ ...target, nextTile: { x: 1, y: 0, z: 20 } }, tuning).heading;
    const next = solver.solve({ ...target, nextTile: { x: 1.1, y: 0, z: 20 } }, tuning).heading;
    expect(Math.abs(next - near)).toBeLessThan(0.01);
  });
});
