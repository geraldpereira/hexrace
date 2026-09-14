import { DOCUMENT } from '@angular/common';
import { type DestroyRef, Injectable, inject, signal } from '@angular/core';
import { GUI } from 'lil-gui';

import { DebugExports } from '@hud/debug/debug-exports';
import { DebugPlots } from '@hud/debug/debug-plots';
import { DebugStore } from '@hud/debug/debug-store';
import { PerfMeter } from '@hud/debug/perf-meter';

const TOGGLE_CODE = 'Backquote';
const WIDTH = 280;

/**
 * The developer's tuning panel: lil-gui, created on first use and toggled with the backquote key,
 * never seen by the player (functional spec 7.5). A module registers a folder and builds it in one
 * call; the folder's values are restored from local storage right after and saved on every change,
 * and the folder goes away with its caller. The root carries the performance meter, a copy of every
 * value as JSON for the code, and a reset of everything.
 */
@Injectable({ providedIn: 'root' })
export class DebugPanel {
  readonly visible = signal(false);

  private readonly document = inject(DOCUMENT);
  private readonly store = inject(DebugStore);
  private readonly meter = inject(PerfMeter);
  private readonly plots = inject(DebugPlots);
  private readonly exports = inject(DebugExports);
  private gui: GUI | null = null;

  /** Builds a folder, restores its values, keeps them; destroyed with `destroyRef` when given. */
  register(title: string, build: (folder: GUI) => void, destroyRef?: DestroyRef): GUI {
    const folder = this.root().addFolder(title);
    build(folder);
    this.store.restore(title, folder);
    folder.onFinishChange(() => {
      this.store.save(title, folder);
    });
    folder
      .add(
        {
          reset: () => {
            folder.reset(true);
            this.store.forget(title);
          },
        },
        'reset',
      )
      .name('Reset folder');
    destroyRef?.onDestroy(() => {
      folder.destroy();
    });
    return folder;
  }

  show(): void {
    this.root().show();
    this.visible.set(true);
  }

  hide(): void {
    this.gui?.hide();
    this.visible.set(false);
  }

  toggle(): void {
    if (this.visible()) this.hide();
    else this.show();
  }

  private root(): GUI {
    if (this.gui) return this.gui;
    const gui = new GUI({ title: 'Debug', width: WIDTH, autoPlace: true });
    gui.hide();
    this.gui = gui;
    this.buildRoot(gui);
    this.document.defaultView?.addEventListener('keydown', this.onKeyDown);
    return gui;
  }

  private buildRoot(gui: GUI): void {
    const perf = gui.addFolder('Performance');
    perf.close();
    perf.add(this.meter, 'fps', 0, 240, 1).name('FPS').listen().disable();
    perf.add(this.meter, 'frameMs', 0, 100, 0.1).name('Frame (ms)').listen().disable();
    perf.add(this.meter, 'stepMs', 0, 50, 0.1).name('Physics step (ms)').listen().disable();
    perf
      .add({ corner: false }, 'corner')
      .name('Corner overlay')
      .onChange((v: boolean) => {
        this.meter.cornerVisible.set(v);
      });
    this.plots.add(perf, { label: 'fps', min: 0, max: 120, sample: () => this.meter.fps });
    gui.add({ copy: () => this.copyValues(gui) }, 'copy').name('Copy values as JSON');
    gui.add({ reset: () => this.resetAll(gui) }, 'reset').name('Reset all');
  }

  private copyValues(gui: GUI): void {
    const json = this.exports.values(gui);
    console.log(json);
    void this.document.defaultView?.navigator.clipboard.writeText(json);
  }

  private resetAll(gui: GUI): void {
    gui.reset(true);
    this.store.forgetAll();
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === TOGGLE_CODE) this.toggle();
  };
}
