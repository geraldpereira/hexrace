import { Injectable, inject } from '@angular/core';
import { type DebugFolder } from '@hexrace/hud';
import { EnvironmentCatalog } from '@hexrace/tile';

import { type TrackMode } from '@hexrace/track';

import { type TrackDraft } from '@ui/lab/track/track-draft';

const SHAPES: readonly TrackMode[] = ['rally', 'track'];

const DIALS: readonly [keyof TrackDraft, string][] = [
  ['turning', 'Turning'],
  ['sharpness', 'Sharpness'],
  ['relief', 'Relief'],
  ['variety', 'Variety'],
  ['obstacles', 'Obstacles'],
];

/**
 * The generator's folder, the same on every page that draws a track from a seed: the seed, the
 * environment, the five dials of the functional spec 5.3, the length, and the button. What to do
 * with the track once it is drawn is the page's business, and comes in as `generate`.
 */
@Injectable({ providedIn: 'root' })
export class GeneratorPanel {
  private readonly environments = inject(EnvironmentCatalog);

  build(folder: DebugFolder, draft: TrackDraft, generate: () => void): void {
    folder.add(draft, 'seed').name('Seed');
    folder.add(draft, 'environment', [...this.environments.ids]).name('Environment');
    for (const [key, label] of DIALS) folder.add(draft, key, 0, 9, 1).name(label);
    folder.add(draft, 'length', 3, 120, 1).name('Tiles');
    folder.add(draft, 'shape', SHAPES).name('Shape');
    folder.add({ generate }, 'generate').name('Generate');
  }
}
