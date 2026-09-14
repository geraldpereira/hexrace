import { TestBed } from '@angular/core/testing';

import { ENVIRONMENTS, ENVIRONMENT_IDS } from '@tile/entity/environments';
import { EnvironmentCatalog } from '@tile/geometry/environment-catalog';

describe('EnvironmentCatalog', () => {
  let environments: EnvironmentCatalog;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    environments = TestBed.inject(EnvironmentCatalog);
  });

  it('lists the three environments of the spec and finds each by its id', () => {
    expect(environments.ids).toEqual(['north', 'europe', 'africa']);
    expect(environments.ids).toBe(ENVIRONMENT_IDS);
    for (const id of environments.ids) {
      expect(environments.of(id)).toBe(ENVIRONMENTS[id]);
      expect(environments.of(id).id).toBe(id);
      expect(environments.of(id).transition).toEqual({ start: 0, end: 1 });
    }
  });

  it('recognises an id in a string', () => {
    expect(environments.isId('europe')).toBe(true);
    expect(environments.isId('mars')).toBe(false);
  });

  it('gives a zone its rank’s colour, magenta beyond the palette', () => {
    const europe = environments.of('europe');
    expect(environments.zoneColor(europe, 'road', 1)).toBe(europe.colors.road[0]);
    expect(environments.zoneColor(europe, 'shoulder', 3)).toBe(europe.colors.shoulder[2]);
    expect(environments.zoneColor(europe, 'landscape', 2)).toBe(europe.colors.landscape[1]);
    expect(environments.zoneColor(europe, 'landscape', 3)).toBe('#ff00ff');
  });
});
