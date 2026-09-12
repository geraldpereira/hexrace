import { MathUtils } from 'three';
import { GameInput } from './gameInput';
import type { InputSource } from './inputSource';

/**
 * Keyboard's contribution to the merged input. W = right trigger, S = left
 * trigger, A/D = left stick X, arrows = right stick, Space = button A,
 * Q/E = left/right bumper.
 */
export class KeyboardSource implements InputSource {
    private static readonly HANDLED_KEYS = new Set([
        'KeyW',
        'KeyS',
        'KeyA',
        'KeyD',
        'ArrowUp',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'Space',
        'KeyQ',
        'KeyE',
        'Escape',
    ]);

    readonly snapshot = new GameInput();
    /** Time (s) for the snapshot to reach ~63% of the target after a key press/release. 0 = instant. */
    smoothingTime = 0.1;

    private readonly heldKeys = new Set<string>();
    private readonly target = {
        leftStickX: 0,
        leftStickY: 0,
        rightStickX: 0,
        rightStickY: 0,
        leftTrigger: 0,
        rightTrigger: 0,
        leftBumper: 0,
        rightBumper: 0,
        buttonA: 0,
    };

    constructor() {
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
        // Avoid stuck keys when the window loses focus mid-press.
        window.addEventListener('blur', this.onBlur);
    }

    /** Step the snapshot toward the target. Called once per fixedUpdate. */
    tick(dt: number): void {
        const alpha = this.smoothingTime > 0 ? 1 - Math.exp(-dt / this.smoothingTime) : 1;
        const { lerp } = MathUtils;
        this.snapshot.leftStickX = lerp(this.snapshot.leftStickX, this.target.leftStickX, alpha);
        this.snapshot.leftStickY = lerp(this.snapshot.leftStickY, this.target.leftStickY, alpha);
        this.snapshot.rightStickX = lerp(this.snapshot.rightStickX, this.target.rightStickX, alpha);
        this.snapshot.rightStickY = lerp(this.snapshot.rightStickY, this.target.rightStickY, alpha);
        this.snapshot.leftTrigger = lerp(this.snapshot.leftTrigger, this.target.leftTrigger, alpha);
        this.snapshot.rightTrigger = lerp(
            this.snapshot.rightTrigger,
            this.target.rightTrigger,
            alpha,
        );
        this.snapshot.leftBumper = this.target.leftBumper;
        this.snapshot.rightBumper = this.target.rightBumper;
        this.snapshot.buttonA = this.target.buttonA;
    }

    clearRequested(): void {
        this.snapshot.pauseRequested = false;
    }

    private recomputeTargets(): void {
        // A/D = left stick X. W/S drive the triggers (throttle / brake) so
        // the keyboard mirrors the gamepad layout.
        const a = this.heldKeys.has('KeyA');
        const d = this.heldKeys.has('KeyD');
        this.target.leftStickX = (d ? 1 : 0) - (a ? 1 : 0);
        this.target.leftStickY = 0;

        // Right stick = arrow keys.
        const up = this.heldKeys.has('ArrowUp');
        const down = this.heldKeys.has('ArrowDown');
        const left = this.heldKeys.has('ArrowLeft');
        const right = this.heldKeys.has('ArrowRight');
        this.target.rightStickX = (right ? 1 : 0) - (left ? 1 : 0);
        this.target.rightStickY = (down ? 1 : 0) - (up ? 1 : 0);

        // Keyboard is on/off, so 0 or 1 — the snapshot smoothing in tick()
        // gives the triggers a soft ramp. The buttons stay binary.
        this.target.rightTrigger = this.heldKeys.has('KeyW') ? 1 : 0;
        this.target.leftTrigger = this.heldKeys.has('KeyS') ? 1 : 0;
        this.target.buttonA = this.heldKeys.has('Space') ? 1 : 0;
        this.target.leftBumper = this.heldKeys.has('KeyQ') ? 1 : 0;
        this.target.rightBumper = this.heldKeys.has('KeyE') ? 1 : 0;
    }

    private onKeyDown = (e: KeyboardEvent): void => {
        if (!KeyboardSource.HANDLED_KEYS.has(e.code)) return;
        e.preventDefault();

        if (e.code === 'Escape' && !e.repeat) {
            this.snapshot.pauseRequested = true;
            return;
        }

        if (!this.heldKeys.has(e.code)) {
            this.heldKeys.add(e.code);
            this.recomputeTargets();
        }
    };

    private onKeyUp = (e: KeyboardEvent): void => {
        if (this.heldKeys.delete(e.code)) {
            this.recomputeTargets();
        }
    };

    private onBlur = (): void => {
        this.heldKeys.clear();
        this.target.leftStickX = 0;
        this.target.leftStickY = 0;
        this.target.rightStickX = 0;
        this.target.rightStickY = 0;
        this.target.leftTrigger = 0;
        this.target.rightTrigger = 0;
        this.target.leftBumper = 0;
        this.target.rightBumper = 0;
        this.target.buttonA = 0;
        this.snapshot.reset();
    };
}
