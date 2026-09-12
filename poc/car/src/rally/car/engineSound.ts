import type GUI from 'lil-gui';
import { Component, GameObject } from '../../engine/gameObject';
import { CarBehavior } from './carBehavior';
import { ENGINE_PROCESSOR_SOURCE } from './engineProcessor';

const CYLINDERS = 4;
const VOLUME = 0.5;
// Pipe comb resonance (Hz): lower = longer exhaust, deeper drone.
const EXHAUST_HZ = 110;
// Multiplier on the three exhaust band-passes (95 / 230 / 520 Hz).
const RESONANCE = 1;
const INTAKE_NOISE = 0.15;
const DRIVE = 1.5;
// Idle rpm wobble amount, 0 = perfectly steady.
const WOBBLE = 0.02;
// Final low-pass: a coasting engine is duller than one pulling.
const FILTER_BASE_HZ = 600;
const FILTER_RPM_HZ = 1500;
const FILTER_LOAD_HZ = 2500;
const SMOOTHING = 0.03;
// Load kept while the gearbox is between two gears: a lift of the foot,
// not a cut. The revs already sag on their own with the clutch open.
const SHIFT_LOAD = 0.5;

/**
 * Procedural engine: an AudioWorklet fires one pressure pulse per cylinder
 * on the crank cycle and runs the train through fixed exhaust resonances
 * (see `engineProcessor.ts`). This component feeds it rpm and throttle each
 * frame and owns the final low-pass and volume.
 *
 * Browsers only let audio start after a user gesture, so the context is
 * created on the first key press or click. Gamepad input alone doesn't count:
 * click the page once.
 */
export class EngineSoundBehavior extends Component {
    enabled = true;
    volume = VOLUME;
    cylinders = CYLINDERS;
    exhaustHz = EXHAUST_HZ;
    resonance = RESONANCE;
    intakeNoise = INTAKE_NOISE;
    drive = DRIVE;
    wobble = WOBBLE;
    filterBaseHz = FILTER_BASE_HZ;
    filterRpmHz = FILTER_RPM_HZ;
    filterLoadHz = FILTER_LOAD_HZ;

    private car!: CarBehavior;
    private ctx: AudioContext | null = null;
    private node: AudioWorkletNode | null = null;
    private master!: GainNode;
    private filter!: BiquadFilterNode;
    private readonly onGesture = (): void => {
        void this.ensureContext();
    };

    override start(): void {
        const car = this.gameObject.findInScene(CarBehavior);
        if (!car) throw new Error('EngineSoundBehavior: no CarBehavior in scene');
        this.car = car;
        window.addEventListener('keydown', this.onGesture);
        window.addEventListener('pointerdown', this.onGesture);
    }

    override onDestroy(): void {
        window.removeEventListener('keydown', this.onGesture);
        window.removeEventListener('pointerdown', this.onGesture);
        void this.ctx?.close();
        this.ctx = null;
        this.node = null;
    }

    override render(): void {
        const ctx = this.ctx;
        const node = this.node;
        if (!ctx || !node) return;
        const t = ctx.currentTime;
        const car = this.car;
        const rpm = Math.max(car.rpm, 0);
        const revShare = Math.min(rpm / Math.max(car.maxRpm, 1), 1);
        const load = car.shifting ? car.throttle * SHIFT_LOAD : car.throttle;

        node.port.postMessage({ rpm, load });
        this.filter.frequency.setTargetAtTime(
            this.filterBaseHz + revShare * this.filterRpmHz + load * this.filterLoadHz,
            t,
            SMOOTHING,
        );
        this.master.gain.setTargetAtTime(this.enabled ? this.volume : 0, t, SMOOTHING);
    }

    override registerDebug(gui: GUI): void {
        const f = gui.addFolder('Engine sound');
        f.close();
        f.add(this, 'enabled').name('Enabled');
        f.add(this, 'volume', 0, 1, 0.05).name('Volume');
        const tune = (): void => {
            this.pushTuning();
        };
        f.add(this, 'cylinders', 1, 12, 1).name('Cylinders').onChange(tune);
        f.add(this, 'exhaustHz', 40, 400, 5).name('Exhaust pipe (Hz)').onChange(tune);
        f.add(this, 'resonance', 0.5, 2, 0.05).name('Resonance pitch').onChange(tune);
        f.add(this, 'intakeNoise', 0, 0.6, 0.01).name('Intake hiss').onChange(tune);
        f.add(this, 'drive', 0.5, 5, 0.1).name('Drive').onChange(tune);
        f.add(this, 'wobble', 0, 0.1, 0.005).name('Idle wobble').onChange(tune);
        f.add(this, 'filterBaseHz', 100, 3000, 10).name('Filter base (Hz)');
        f.add(this, 'filterRpmHz', 0, 8000, 50).name('Filter per rev (Hz)');
        f.add(this, 'filterLoadHz', 0, 8000, 50).name('Filter per load (Hz)');
    }

    private pushTuning(): void {
        this.node?.port.postMessage({
            cylinders: this.cylinders,
            exhaustHz: this.exhaustHz,
            resonance: this.resonance,
            intakeNoise: this.intakeNoise,
            drive: this.drive,
            wobble: this.wobble,
        });
    }

    private async ensureContext(): Promise<void> {
        if (this.ctx) {
            if (this.ctx.state === 'suspended') await this.ctx.resume();
            return;
        }
        const ctx = new AudioContext();
        this.ctx = ctx;

        const blob = new Blob([ENGINE_PROCESSOR_SOURCE], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        try {
            await ctx.audioWorklet.addModule(url);
        } finally {
            URL.revokeObjectURL(url);
        }
        // The component may have been destroyed while the module loaded.
        if (this.ctx !== ctx) return;

        this.master = ctx.createGain();
        this.master.gain.value = 0;
        this.filter = ctx.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.Q.value = 0.8;
        this.filter.connect(this.master);
        this.master.connect(ctx.destination);

        const node = new AudioWorkletNode(ctx, 'engine-processor', {
            numberOfInputs: 0,
            outputChannelCount: [1],
        });
        node.connect(this.filter);
        this.node = node;
        this.pushTuning();
    }
}

export function createEngineSound(): GameObject {
    return new GameObject('engineSound', [new EngineSoundBehavior()]);
}
