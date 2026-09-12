import type GUI from 'lil-gui';
import { Component, GameObject } from '../../engine/gameObject';
import { AudioHub } from '../../engine/audio/audioHub';
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
// Rev limiter chatter: on hitting the max rpm under throttle, or through a
// full-throttle upshift (the clutch opens, the revs would spike).
const LIMITER_RPM_SHARE = 0.97;
const LIMITER_THROTTLE = 0.5;
const FLAT_SHIFT_THROTTLE = 0.7;
const LIMITER_HZ = 14;
// Exhaust pops on a downshift with the foot off. The automatic box drops a
// gear at the shift-down rpm (~38 % of max), so the floor sits just under.
const POP_THROTTLE = 0.3;
const POP_MIN_RPM_SHARE = 0.3;
const POP_LEVEL = 1.4;
// How uneven the engine runs: firing scatter, drift, misfires, pipe drift.
const UNEVENNESS = 0.6;
const POPS_MIN = 1;
const POPS_MAX = 3;
// Overrun: lifting off from a hard pull at high revs bangs once or twice,
// then the pipe keeps crackling at random while coasting up there.
const OVERRUN_LIFT_FROM = 0.5;
const OVERRUN_THROTTLE = 0.1;
const OVERRUN_MIN_RPM_SHARE = 0.5;
/** Average crackles per second while coasting at max revs. */
const OVERRUN_RATE = 2;

/**
 * Procedural engine: an AudioWorklet fires one pressure pulse per cylinder
 * on the crank cycle and runs the train through fixed exhaust resonances
 * (see `engineProcessor.ts`). This component feeds it rpm and throttle each
 * frame and owns the final low-pass and volume.
 *
 * Audio starts on the first key press or click (see AudioHub).
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
    limiterHz = LIMITER_HZ;
    popLevel = POP_LEVEL;
    unevenness = UNEVENNESS;
    overrunRate = OVERRUN_RATE;
    /** Rev limiter active this frame, debug readout. */
    limiter = false;
    filterBaseHz = FILTER_BASE_HZ;
    filterRpmHz = FILTER_RPM_HZ;
    filterLoadHz = FILTER_LOAD_HZ;

    private car!: CarBehavior;
    private ctx: AudioContext | null = null;
    private node: AudioWorkletNode | null = null;
    private master!: GainNode;
    private filter!: BiquadFilterNode;
    private prevGear = 0;
    private prevLimiter = false;
    private prevThrottle = 0;
    private destroyed = false;

    override start(): void {
        const car = this.gameObject.findInScene(CarBehavior);
        if (!car) throw new Error('EngineSoundBehavior: no CarBehavior in scene');
        this.car = car;
        AudioHub.get().whenReady((ctx) => {
            void this.build(ctx);
        });
    }

    override onDestroy(): void {
        this.destroyed = true;
        this.node?.disconnect();
        this.node = null;
        this.ctx = null;
    }

    override render(dt: number): void {
        const ctx = this.ctx;
        const node = this.node;
        if (!ctx || !node) return;
        const t = ctx.currentTime;
        const car = this.car;
        const rpm = Math.max(car.rpm, 0);
        const revShare = Math.min(rpm / Math.max(car.maxRpm, 1), 1);
        const load = car.shifting ? car.throttle * SHIFT_LOAD : car.throttle;

        // Gear edges: Jolt (and the manual box) switch the gear index at the
        // start of the change, so one frame sees the jump.
        const gearUp = car.gear > this.prevGear && this.prevGear > 0;
        const gearDown = car.gear < this.prevGear && car.gear > 0;
        this.prevGear = car.gear;

        const onLimiter = revShare >= LIMITER_RPM_SHARE && car.throttle >= LIMITER_THROTTLE;
        const flatShift = car.shifting && car.throttle >= FLAT_SHIFT_THROTTLE;
        this.limiter = onLimiter || flatShift;
        if (gearUp && car.throttle >= FLAT_SHIFT_THROTTLE) this.limiter = true;

        const message: Record<string, number | boolean> = { rpm, load };
        if (this.limiter !== this.prevLimiter) {
            message.limiter = this.limiter;
            this.prevLimiter = this.limiter;
        }
        let pops = 0;
        if (gearDown && car.throttle <= POP_THROTTLE && revShare >= POP_MIN_RPM_SHARE) {
            pops += POPS_MIN + Math.floor(Math.random() * (POPS_MAX - POPS_MIN + 1));
        }
        const highRevs = revShare >= OVERRUN_MIN_RPM_SHARE && !car.shifting;
        const lift = this.prevThrottle >= OVERRUN_LIFT_FROM && car.throttle < OVERRUN_THROTTLE;
        if (highRevs && lift) pops += 1 + Math.floor(Math.random() * 2);
        if (highRevs && car.throttle < OVERRUN_THROTTLE) {
            const rate =
                (this.overrunRate * (revShare - OVERRUN_MIN_RPM_SHARE)) /
                (1 - OVERRUN_MIN_RPM_SHARE);
            if (Math.random() < rate * dt) pops += 1;
        }
        this.prevThrottle = car.throttle;
        if (pops > 0) message.pops = pops;
        node.port.postMessage(message);
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
        f.add(this, 'limiterHz', 5, 30, 1).name('Limiter chatter (Hz)').onChange(tune);
        f.add(this, 'popLevel', 0, 3, 0.1).name('Pop level').onChange(tune);
        f.add(this, 'unevenness', 0, 1, 0.05).name('Unevenness').onChange(tune);
        f.add(this, 'overrunRate', 0, 8, 0.5).name('Overrun crackle (/s)');
        f.add(this, 'limiter').name('Limiter active').listen().disable();
        f.add({ pop: () => this.node?.port.postMessage({ pops: 2 }) }, 'pop').name('Test pops');
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
            limiterHz: this.limiterHz,
            popLevel: this.popLevel,
            unevenness: this.unevenness,
        });
    }

    private async build(ctx: AudioContext): Promise<void> {
        await AudioHub.get().loadWorklet(ctx, 'engine-processor', ENGINE_PROCESSOR_SOURCE);
        if (this.destroyed) return;
        this.ctx = ctx;

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
