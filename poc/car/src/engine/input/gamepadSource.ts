import { GameInput } from './gameInput';
import type { InputSource } from './inputSource';

// Standard mapping (Xbox-style): https://w3c.github.io/gamepad/#remapping
enum Button {
    LB = 4,
    BACK = 8,
    START = 9,
    DPAD_UP = 12,
    DPAD_DOWN = 13,
    DPAD_LEFT = 14,
    DPAD_RIGHT = 15,
}

enum Axis {
    LX = 0,
    LY = 1,
    RX = 2,
    RY = 3,
}

/** Gamepad's contribution to the merged input. */
export class GamepadSource implements InputSource {
    private static readonly STICK_DEADZONE = 0.15;
    private static readonly TRIGGER_DEADZONE = 0.05;

    readonly snapshot = new GameInput();
    private activeIndex: number | null = null;
    private readonly prevPressed = new Map<number, boolean>();

    constructor() {
        window.addEventListener('gamepadconnected', this.onConnected);
        window.addEventListener('gamepaddisconnected', this.onDisconnected);
    }

    clearRequested(): void {
        this.snapshot.pauseRequested = false;
    }

    poll(): void {
        if (this.activeIndex === null) return;

        const pad = navigator.getGamepads()[this.activeIndex];
        if (!pad) {
            this.snapshot.reset();
            return;
        }

        const rt = GamepadSource.btnValue(pad.buttons[7]);
        const lt = GamepadSource.btnValue(pad.buttons[6]);
        this.snapshot.rightTrigger = rt > GamepadSource.TRIGGER_DEADZONE ? rt : 0;
        this.snapshot.leftTrigger = lt > GamepadSource.TRIGGER_DEADZONE ? lt : 0;
        this.snapshot.leftBumper = GamepadSource.btnPressed(pad.buttons[Button.LB]) ? 1 : 0;

        // Left stick: fall back to D-pad for the X axis when the stick is idle.
        const lx = GamepadSource.applyDeadzone(
            pad.axes[Axis.LX] ?? 0,
            GamepadSource.STICK_DEADZONE,
        );
        const dpadL = GamepadSource.btnPressed(pad.buttons[Button.DPAD_LEFT]) ? 1 : 0;
        const dpadR = GamepadSource.btnPressed(pad.buttons[Button.DPAD_RIGHT]) ? 1 : 0;
        this.snapshot.leftStickX = lx !== 0 ? lx : dpadR - dpadL;
        this.snapshot.leftStickY = GamepadSource.applyDeadzone(
            pad.axes[Axis.LY] ?? 0,
            GamepadSource.STICK_DEADZONE,
        );

        this.snapshot.rightStickX = GamepadSource.applyDeadzone(
            pad.axes[Axis.RX] ?? 0,
            GamepadSource.STICK_DEADZONE,
        );
        this.snapshot.rightStickY = GamepadSource.applyDeadzone(
            pad.axes[Axis.RY] ?? 0,
            GamepadSource.STICK_DEADZONE,
        );

        const startEdge = this.risingEdge(
            Button.START,
            GamepadSource.btnPressed(pad.buttons[Button.START]),
        );
        const backEdge = this.risingEdge(
            Button.BACK,
            GamepadSource.btnPressed(pad.buttons[Button.BACK]),
        );
        if (startEdge || backEdge) {
            this.snapshot.pauseRequested = true;
        }
    }

    private static applyDeadzone(v: number, dz: number): number {
        const a = Math.abs(v);
        if (a < dz) return 0;
        return Math.sign(v) * ((a - dz) / (1 - dz));
    }

    private static btnValue(b: GamepadButton | undefined): number {
        return b ? b.value : 0;
    }

    private static btnPressed(b: GamepadButton | undefined): boolean {
        return !!b && (b.pressed || b.value > 0.5);
    }

    private static pickFirstConnected(): number | null {
        const pads = navigator.getGamepads();
        for (const p of pads) {
            if (p) return p.index;
        }
        return null;
    }

    private risingEdge(index: number, pressed: boolean): boolean {
        const prev = this.prevPressed.get(index) ?? false;
        this.prevPressed.set(index, pressed);
        return pressed && !prev;
    }

    private onConnected = (e: GamepadEvent): void => {
        this.activeIndex ??= e.gamepad.index;
    };

    private onDisconnected = (e: GamepadEvent): void => {
        if (this.activeIndex === e.gamepad.index) {
            this.activeIndex = null;
            this.prevPressed.clear();
            this.snapshot.reset();
            this.activeIndex = GamepadSource.pickFirstConnected();
        }
    };
}
