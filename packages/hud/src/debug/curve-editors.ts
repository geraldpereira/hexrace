import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import { type GUI } from 'lil-gui';

import { CurveEditor, type CurveEditorOptions } from '@hud/debug/curve-editor';

/**
 * Makes curve editors: a `CurveEditor` is a DOM widget built inside the injection context, so it
 * finds its widgets and painter with `inject()`; `add` also mounts it as a row of a lil-gui folder.
 */
@Injectable({ providedIn: 'root' })
export class CurveEditors {
  private readonly injector = inject(EnvironmentInjector);

  create(options: CurveEditorOptions): CurveEditor {
    return runInInjectionContext(this.injector, () => new CurveEditor(options));
  }

  add(gui: GUI, options: CurveEditorOptions): CurveEditor {
    const editor = this.create(options);
    gui.$children.appendChild(editor.element);
    return editor;
  }
}
