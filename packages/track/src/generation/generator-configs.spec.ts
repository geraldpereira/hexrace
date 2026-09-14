import { TestBed } from '@angular/core/testing';

import { DEFAULT_GENERATOR } from '@track/entity/generation';
import { GeneratorConfigs } from '@track/generation/generator-configs';

describe('GeneratorConfigs', () => {
  let configs: GeneratorConfigs;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    configs = TestBed.inject(GeneratorConfigs);
  });

  it('writes and reads the setting string back', () => {
    const text = configs.format(DEFAULT_GENERATOR);
    expect(text).toBe('europe:hexrace:t5s3r4v4o3:n30');
    expect(configs.parse(` ${text} `)).toEqual(DEFAULT_GENERATOR);
  });

  it.each([
    'mars:x:t1s1r1v1o1:n10',
    'europe:x:t1s1r1v1:n10',
    'europe:x:t1s1r1v1o1:n0',
    'europe:x:t1s1r1v1o1:n501',
    'nonsense',
  ])('refuses %s', (text: string) => {
    expect(configs.parse(text)).toBeNull();
  });

  it('brings the dials from nine down to one, clamping what is out of range', () => {
    expect(
      configs.normalize({ turning: 9, sharpness: 0, relief: 12, variety: -3, obstacles: 4 }),
    ).toEqual({
      turning: 1,
      sharpness: 0,
      relief: 1,
      variety: 0,
      obstacles: 4 / 9,
    });
  });
});
