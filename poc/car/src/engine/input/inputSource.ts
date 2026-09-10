import type { GameInput } from './gameInput';

/** Common shape for any input source (keyboard, gamepad, touch...) feeding into the merged input. */
export interface InputSource {
    readonly snapshot: GameInput;
    /** Drain one-shot edge events (pause) so they fire exactly once. */
    clearRequested(): void;
}
