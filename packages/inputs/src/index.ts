/**
 * The player's inputs: device-free actions (`InputActions`), read merged from `Inputs`. Sources sit
 * behind `INPUT_SOURCES` and `provideInputSources()` plugs in the game's three. The sources are
 * exported for their settings and for drawing the paddles, never for reading actions directly.
 */
export { InputActions } from '@inputs/entity/input-actions';
export { INPUT_SOURCES, type InputSource, type InputSourceId } from '@inputs/entity/input-source';
export { Inputs } from '@inputs/merge/inputs';
export { provideInputSources } from '@inputs/merge/provide-input-sources';
export { GamepadSource } from '@inputs/sources/gamepad-source';
export { KeyboardSource } from '@inputs/sources/keyboard-source';
export { TouchSource, type TouchPaddle, type TouchZone } from '@inputs/sources/touch-source';
