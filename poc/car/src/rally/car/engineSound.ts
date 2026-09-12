import type GUI from 'lil-gui';
import { Component, GameObject } from '../../engine/gameObject';
import { CarBehavior } from './carBehavior';

// Four-stroke engine: each cylinder fires once every two revolutions, so
// the firing frequency is RPM / 60 * cylinders / 2. A 4-cylinder idles at
// ~33 Hz and screams at ~233 Hz at 7000 RPM.
const CYLINDERS = 4;
// Pitch multiplier on the firing frequency: below 1 fakes a bigger engine
// without touching the cylinder count.
const PITCH = 0.7;
const VOLUME = 0.35;
// Gain and filter follow throttle (load) as much as revs: a coasting engine
// is quieter and duller than one pulling.
const IDLE_GAIN = 0.25;
const LOAD_GAIN = 0.55;
const FILTER_BASE_HZ = 180;
const FILTER_RPM_HZ = 1400;
const FILTER_LOAD_HZ = 1200;
// Smoothing time constant (s) for every AudioParam ramp.
const SMOOTHING = 0.03;
// Short dip while the gearbox is between two gears, the arcade "shift blip".
const SHIFT_GAIN = 0.5;

interface Voice {
    osc: OscillatorNode;
    /** Frequency multiplier against the firing frequency. */
    ratio: number;
    gain: GainNode;
}

/**
 * Procedural engine note: a few oscillators locked to the firing frequency
 * (fundamental, half-order rumble, second harmonic) through a low-pass
 * filter, with gain and cutoff driven by revs and throttle. Placeholder for
 * a sample-based loop later; enough to hear the gears and the redline.
 *
 * Browsers only let audio start after a user gesture, so the context is
 * created on the first key press or click. Gamepad input alone doesn't count:
 * click the page once.
 */
export class EngineSoundBehavior extends Component {
    enabled = true;
    volume = VOLUME;
    cylinders = CYLINDERS;
    pitch = PITCH;
    idleGain = IDLE_GAIN;
    loadGain = LOAD_GAIN;
    filterBaseHz = FILTER_BASE_HZ;
    filterRpmHz = FILTER_RPM_HZ;
    filterLoadHz = FILTER_LOAD_HZ;
    /** Current firing frequency (Hz), debug readout. */
    frequency = 0;

    private car!: CarBehavior;
    private ctx: AudioContext | null = null;
    private master!: GainNode;
    private filter!: BiquadFilterNode;
    private voices: Voice[] = [];
    private readonly onGesture = (): void => {
        this.ensureContext();
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
    }

    override render(): void {
        const ctx = this.ctx;
        if (!ctx) return;
        const t = ctx.currentTime;
        const car = this.car;
        const rpm = Math.max(car.rpm, 0);
        this.frequency = (rpm / 60) * (this.cylinders / 2) * this.pitch;
        const revShare = Math.min(rpm / Math.max(car.maxRpm, 1), 1);
        const load = car.throttle;

        for (const v of this.voices) {
            v.osc.frequency.setTargetAtTime(this.frequency * v.ratio, t, SMOOTHING);
        }
        this.filter.frequency.setTargetAtTime(
            this.filterBaseHz + revShare * this.filterRpmHz + load * this.filterLoadHz,
            t,
            SMOOTHING,
        );
        let gain = this.enabled ? this.volume * (this.idleGain + load * this.loadGain) : 0;
        if (car.shifting) gain *= SHIFT_GAIN;
        this.master.gain.setTargetAtTime(gain, t, SMOOTHING);
    }

    override registerDebug(gui: GUI): void {
        const f = gui.addFolder('Engine sound');
        f.close();
        f.add(this, 'enabled').name('Enabled');
        f.add(this, 'volume', 0, 1, 0.05).name('Volume');
        f.add(this, 'cylinders', 1, 12, 1).name('Cylinders');
        f.add(this, 'pitch', 0.25, 2, 0.05).name('Pitch');
        f.add(this, 'idleGain', 0, 1, 0.05).name('Idle gain');
        f.add(this, 'loadGain', 0, 1, 0.05).name('Load gain');
        f.add(this, 'filterBaseHz', 50, 2000, 10).name('Filter base (Hz)');
        f.add(this, 'filterRpmHz', 0, 8000, 50).name('Filter per rev (Hz)');
        f.add(this, 'filterLoadHz', 0, 8000, 50).name('Filter per load (Hz)');
        f.add(this, 'frequency', 0, 600, 1).name('Firing freq (Hz)').listen().disable();
    }

    private ensureContext(): void {
        if (this.ctx) {
            if (this.ctx.state === 'suspended') void this.ctx.resume();
            return;
        }
        const ctx = new AudioContext();
        this.ctx = ctx;

        this.master = ctx.createGain();
        this.master.gain.value = 0;
        this.filter = ctx.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.Q.value = 1.2;
        this.filter.connect(this.master);
        this.master.connect(ctx.destination);

        // Sawtooth fundamental carries the note, the half-order square adds
        // the uneven rumble of a real exhaust, the quarter-order sine is the
        // chest-thumping sub, the octave keeps it from sounding like a synth
        // bass.
        this.voices = [
            this.addVoice('sawtooth', 1, 0.55),
            this.addVoice('square', 0.5, 0.4),
            this.addVoice('sine', 0.25, 0.5),
            this.addVoice('sawtooth', 2.01, 0.1),
        ];
        for (const v of this.voices) v.osc.start();
    }

    private addVoice(type: OscillatorType, ratio: number, level: number): Voice {
        if (!this.ctx) throw new Error('EngineSoundBehavior: no AudioContext');
        const osc = this.ctx.createOscillator();
        osc.type = type;
        const gain = this.ctx.createGain();
        gain.gain.value = level;
        osc.connect(gain);
        gain.connect(this.filter);
        return { osc, ratio, gain };
    }
}

export function createEngineSound(): GameObject {
    return new GameObject('engineSound', [new EngineSoundBehavior()]);
}
