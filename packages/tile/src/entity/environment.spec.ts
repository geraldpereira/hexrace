import { TestBed } from '@angular/core/testing';

import { Environments } from '@tile/entity/environment';

describe('Environments', () => {
  let environments: Environments;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    environments = TestBed.inject(Environments);
  });

  it('offers three, each with three roads, three shoulders and two landscapes', () => {
    expect(environments.ids).toEqual(['north', 'europe', 'africa']);
    for (const id of environments.ids) {
      const environment = environments.of(id);
      expect(environment.id).toBe(id);
      expect(environment.colors.road).toHaveLength(3);
      expect(environment.colors.shoulder).toHaveLength(3);
      expect(environment.colors.landscape).toHaveLength(2);
      expect(environment.transition).toEqual({ start: 0, end: 1 });
    }
  });

  it('recognises an environment id', () => {
    expect(environments.isId('europe')).toBe(true);
    expect(environments.isId('mars')).toBe(false);
  });

  it('colours a zone by its rank and paints an unknown rank magenta', () => {
    const europe = environments.of('europe');
    expect(environments.zoneColor(europe, 'road', 1)).toBe(europe.colors.road[0]);
    expect(environments.zoneColor(europe, 'shoulder', 3)).toBe(europe.colors.shoulder[2]);
    expect(environments.zoneColor(europe, 'landscape', 2)).toBe(europe.colors.landscape[1]);
    expect(environments.zoneColor(europe, 'landscape', 3)).toBe('#ff00ff');
  });
});
