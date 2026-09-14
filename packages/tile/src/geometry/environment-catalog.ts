import { Injectable } from '@angular/core';

import { type Environment, type EnvironmentId } from '@tile/entity/environment';
import { ENVIRONMENTS, ENVIRONMENT_IDS } from '@tile/entity/environments';
import { type Zone } from '@tile/entity/zone';

/** The catalogue of environments (functional spec 2.2), looked up by id, and a zone's colour. */
@Injectable({ providedIn: 'root' })
export class EnvironmentCatalog {
  readonly ids = ENVIRONMENT_IDS;

  of(id: EnvironmentId): Environment {
    return ENVIRONMENTS[id];
  }

  isId(value: string): value is EnvironmentId {
    return (ENVIRONMENT_IDS as readonly string[]).includes(value);
  }

  /** The colour of a zone by its rank in the palette; magenta when the rank does not exist. */
  zoneColor(environment: Environment, zone: Zone, type: number): string {
    return environment.colors[zone][type - 1] ?? '#ff00ff';
  }
}
