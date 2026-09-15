import { Injectable, inject } from '@angular/core';
import { type DebugFolder } from '@hexrace/hud';
import { TileMeshes } from '@hexrace/tile';
import { TrackExamples } from '@hexrace/track';

import { GeneratorPanel } from '@ui/lab/track/generator-panel';
import { type TrackDraft } from '@ui/lab/track/track-draft';

type Knob = ReturnType<DebugFolder['add']>;

/** What the panel drives on the page: the draft it edits, and what has to happen after a change. */
export interface TrackPage {
  readonly draft: TrackDraft;
  rebuild(): void;
  moveTo(position: number): void;
  dropOnPlayer(): void;
  clearAllCrates(): void;
}

/**
 * The debug folder of the track showcase: where the track comes from, the dials of the generator,
 * how many tiles live around the player, where the player stands, and the crates. The player
 * slider grows with the track it is shown, which is what `onTrackLoaded` is for.
 */
@Injectable({ providedIn: 'root' })
export class TrackPanel {
  private readonly examples = inject(TrackExamples);
  private readonly meshes = inject(TileMeshes);
  private readonly generators = inject(GeneratorPanel);
  private position: Knob | null = null;

  build(folder: DebugFolder, page: TrackPage): void {
    const draft = page.draft;
    const rebuild = (): void => {
      page.rebuild();
    };
    const move = (): void => {
      page.moveTo(draft.position);
    };
    folder
      .add(draft, 'example', this.examples.ids())
      .name('Example')
      .onChange(() => {
        draft.source = 'example';
        page.rebuild();
      });
    this.generator(folder.addFolder('Generator'), page);
    this.window(folder.addFolder('Window'), page, move);
    this.view(folder.addFolder('View'), draft, rebuild, move);
    folder
      .add(
        {
          drop: () => {
            page.dropOnPlayer();
          },
        },
        'drop',
      )
      .name('Drop a crate');
    folder
      .add(
        {
          clear: () => {
            page.clearAllCrates();
          },
        },
        'clear',
      )
      .name('Clear crates');
  }

  /** Stretches the player slider to the track just loaded. */
  onTrackLoaded(tiles: number): void {
    this.position?.max(Math.max(1, tiles)).updateDisplay();
  }

  private generator(folder: DebugFolder, page: TrackPage): void {
    this.generators.build(folder, page.draft, () => {
      page.draft.source = 'generated';
      page.rebuild();
    });
  }

  private window(folder: DebugFolder, page: TrackPage, move: () => void): void {
    folder.add(page.draft, 'ahead', 0, 12, 1).name('Tiles ahead').onChange(move);
    folder.add(page.draft, 'behind', 0, 12, 1).name('Tiles behind').onChange(move);
    this.position = folder
      .add(page.draft, 'position', 0, 1, 0.05)
      .name('Player position')
      .onChange((value: number) => {
        page.moveTo(value);
      });
  }

  private view(
    folder: DebugFolder,
    draft: TrackDraft,
    rebuild: () => void,
    move: () => void,
  ): void {
    folder.add(draft, 'smooth').name('Smooth shading').onChange(rebuild);
    folder.add(draft, 'roughness').name('Swell relief').onChange(rebuild);
    folder.add(this.meshes, 'relief', 0, 5, 0.1).name('Relief depth').onChange(rebuild);
    folder.add(this.meshes, 'shading', 0, 1, 0.05).name('Relief tint').onChange(rebuild);
    folder.add(draft, 'outline').name('Tile outline').onChange(rebuild);
    folder.add(draft, 'follow').name('Camera follows').onChange(move);
    folder.add(draft, 'map').name('2D map').onChange(move);
  }
}
