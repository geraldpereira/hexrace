import { type Provider } from '@angular/core';

import { INPUT_SOURCES } from '@inputs/merge/input-sources';
import { GamepadSource } from '@inputs/sources/gamepad-source';
import { KeyboardSource } from '@inputs/sources/keyboard-source';
import { TouchSource } from '@inputs/sources/touch-source';

/**
 * The game's three sources, plugged into `INPUT_SOURCES`. The application provides them in its
 * `app.config.ts`; a test provides its own instead.
 */
export function provideInputSources(): Provider[] {
  return [
    { provide: INPUT_SOURCES, useExisting: GamepadSource, multi: true },
    { provide: INPUT_SOURCES, useExisting: KeyboardSource, multi: true },
    { provide: INPUT_SOURCES, useExisting: TouchSource, multi: true },
  ];
}
