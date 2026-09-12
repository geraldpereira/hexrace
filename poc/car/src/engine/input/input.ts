import { clamp } from 'lodash-es';
import type GUI from 'lil-gui';
import { KeyboardSource } from './keyboardSource';
import { GamepadSource } from './gamepadSource';
import { GameInput } from './gameInput';
import { Component, GameObject } from '../gameObject';
import { PHYSICS_TIMESTEP } from '../physics';

export { GameInput } from './gameInput';

/**
 * Aggregates per-source snapshots (keyboard, gamepad, ...) into a merged input.
 * Must run first in the tick so consumers see up-to-date values — keep this GO
 * as the first child of the root.
 */
export class InputBehavior extends Component {
    readonly merged = new GameInput();
    private readonly keyboard = new KeyboardSource();
    private readonly gamepad = new GamepadSource();

    override fixedUpdate(): void {
        this.gamepad.poll();
        this.keyboard.tick(PHYSICS_TIMESTEP);

        const kb = this.keyboard.snapshot;
        const gp = this.gamepad.snapshot;

        this.merged.leftStickX = clamp(kb.leftStickX + gp.leftStickX, -1, 1);
        this.merged.leftStickY = clamp(kb.leftStickY + gp.leftStickY, -1, 1);
        this.merged.rightStickX = clamp(kb.rightStickX + gp.rightStickX, -1, 1);
        this.merged.rightStickY = clamp(kb.rightStickY + gp.rightStickY, -1, 1);
        this.merged.leftTrigger = Math.max(kb.leftTrigger, gp.leftTrigger);
        this.merged.rightTrigger = Math.max(kb.rightTrigger, gp.rightTrigger);
        this.merged.leftBumper = Math.max(kb.leftBumper, gp.leftBumper);
        this.merged.rightBumper = Math.max(kb.rightBumper, gp.rightBumper);
        this.merged.buttonA = Math.max(kb.buttonA, gp.buttonA);

        this.merged.pauseRequested = kb.pauseRequested || gp.pauseRequested;

        this.keyboard.clearRequested();
        this.gamepad.clearRequested();
    }

    override registerDebug(gui: GUI): void {
        const folder = gui.addFolder('Input');
        folder.add(this.keyboard, 'smoothingTime', 0, 0.5, 0.01).name('Keyboard smoothing (s)');
        folder.add(this.merged, 'leftStickX', -1, 1).listen().disable();
        folder.add(this.merged, 'leftStickY', -1, 1).listen().disable();
        folder.add(this.merged, 'rightStickX', -1, 1).listen().disable();
        folder.add(this.merged, 'rightStickY', -1, 1).listen().disable();
        folder.add(this.merged, 'leftTrigger', 0, 1).listen().disable();
        folder.add(this.merged, 'rightTrigger', 0, 1).listen().disable();
        folder.add(this.merged, 'leftBumper', 0, 1).listen().disable();
        folder.add(this.merged, 'rightBumper', 0, 1).listen().disable();
        folder.add(this.merged, 'buttonA', 0, 1).listen().disable();
    }
}

export function createInput(): GameObject {
    return new GameObject('input', [new InputBehavior()]);
}
