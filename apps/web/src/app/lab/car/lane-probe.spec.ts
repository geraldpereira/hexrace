import { LaneProbe } from '@ui/lab/car/lane-probe';

describe('LaneProbe', () => {
  let probe: LaneProbe;

  beforeEach(() => {
    probe = new LaneProbe();
    probe.laneWidth = 10;
    probe.lanes = [
      { environment: 'europe', zone: 'road', rank: 1 },
      { environment: 'europe', zone: 'road', rank: 2 },
      { environment: 'europe', zone: 'road', rank: 3 },
      { environment: 'europe', zone: 'shoulder', rank: 1 },
    ];
  });

  it('answers the lane a point stands in, and the middle of a lane', () => {
    expect(probe.centreOf(0)).toBe(-15);
    expect(probe.centreOf(3)).toBe(15);
    expect(probe.at({ x: -15, y: 0, z: 0 })?.rank).toBe(1);
    expect(probe.at({ x: 5, y: 0, z: 0 })?.rank).toBe(3);
  });

  it('keeps the nearest lane off the painted ground, and says nothing without one', () => {
    expect(probe.at({ x: -400, y: 0, z: 0 })?.rank).toBe(1);
    expect(probe.at({ x: 400, y: 0, z: 0 })?.zone).toBe('shoulder');
    probe.lanes = [];
    expect(probe.at({ x: 0, y: 0, z: 0 })).toBeNull();
  });
});
