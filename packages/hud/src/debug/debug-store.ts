import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { type Controller, FunctionController, type GUI } from 'lil-gui';

const KEY_PREFIX = 'hexrace.debug.';

/**
 * Keeps a debug folder's values across reloads, in the browser's local storage, one key per folder.
 * Read-only readouts and buttons are neither saved nor restored: a stale readout would show until
 * the next frame overwrote it, and a button has no value. A folder is restored right after it is
 * built, so every controller it will ever have already exists.
 */
@Injectable({ providedIn: 'root' })
export class DebugStore {
  private readonly storage = (inject(DOCUMENT).defaultView as Window).localStorage;

  save(title: string, folder: GUI): void {
    const values: Record<string, unknown> = {};
    for (const [path, controller] of this.tweakables(folder)) values[path] = controller.getValue();
    this.storage.setItem(KEY_PREFIX + title, JSON.stringify(values));
  }

  restore(title: string, folder: GUI): void {
    const raw = this.storage.getItem(KEY_PREFIX + title);
    if (raw === null) return;
    const values = JSON.parse(raw) as Record<string, unknown>;
    for (const [path, controller] of this.tweakables(folder)) {
      if (path in values) controller.setValue(values[path]);
    }
  }

  forget(title: string): void {
    this.storage.removeItem(KEY_PREFIX + title);
  }

  forgetAll(): void {
    const mine = Object.keys(this.storage).filter((k) => k.startsWith(KEY_PREFIX));
    for (const key of mine) this.storage.removeItem(key);
  }

  private tweakables(folder: GUI): [string, Controller][] {
    return folder
      .controllersRecursive()
      .filter((c) => !(c instanceof FunctionController) && !c._disabled)
      .map((c) => [this.pathOf(c, folder), c]);
  }

  private pathOf(controller: Controller, root: GUI): string {
    const parts = [controller.property];
    for (let gui = controller.parent; gui !== root; gui = gui.parent) parts.unshift(gui._title);
    return parts.join('/');
  }
}
