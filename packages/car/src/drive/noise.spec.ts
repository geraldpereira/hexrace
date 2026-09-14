import { TestBed } from '@angular/core/testing';

import { Noise } from '@car/drive/noise';

describe('Noise', () => {
  let noise: Noise;

  beforeEach(() => {
    noise = TestBed.inject(Noise);
  });

  it('stays in -1..1 and repeats itself at the same place', () => {
    const samples = [];
    for (let i = 0; i < 200; i++) samples.push(noise.at(i * 0.37, i * 0.11));
    for (const v of samples) expect(Math.abs(v)).toBeLessThanOrEqual(1);
    expect(noise.at(3.25, 1.5)).toBe(noise.at(3.25, 1.5));
    expect(noise.at(-3.25, -1.5)).toBe(noise.at(-3.25, -1.5));
  });

  it('varies smoothly and is not a constant', () => {
    const a = noise.at(2, 2);
    const near = noise.at(2.01, 2);
    const far = noise.at(9.5, 4.5);
    expect(Math.abs(near - a)).toBeLessThan(0.2);
    expect(far).not.toBe(a);
  });
});
