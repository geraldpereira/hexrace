import {
  EnvironmentInjector,
  Injectable,
  createEnvironmentInjector,
  inject,
  type Provider,
} from '@angular/core';

import { Scene } from '@engine/scene/scene';

/** Creates scenes under the application's injector; the scene provides itself to its components. */
@Injectable({ providedIn: 'root' })
export class Scenes {
  private readonly parent = inject(EnvironmentInjector);

  create(providers: Provider[] = []): Scene {
    const scene = new Scene();
    scene.injector = createEnvironmentInjector(
      [...providers, { provide: Scene, useValue: scene }],
      this.parent,
    );
    return scene;
  }
}
