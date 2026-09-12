import type GUI from 'lil-gui';
import { Component, GameObject } from '../../engine/gameObject';
import { AudioHub } from '../../engine/audio/audioHub';
import { CarBehavior } from './carBehavior';
import { SURFACES, type RollSound } from '../terrain/surfaces';
import { CHASSIS_PROCESSOR_SOURCE } from './chassisProcessor';

const VOLUME = 0.5;
const ROLL_LEVEL = 1;
// Rolling: full at this speed (km/h), and the curve's exponent (>1 = quiet at low speed).
const ROLL_FULL_KMH = 90;
const ROLL_EXPONENT = 1.4;
const WIND_LEVEL = 0.9;
// Wind reaches its full level at this speed (km/h).
const WIND_FULL_KMH = 150;
// Suspension: compression speed (m/s) where a thump starts and is full.
const THUMP_START = 1;
const THUMP_FULL = 3.5;
// Rebound (extension) speed for the lighter clank.
const REBOUND_START = 1.8;
const REBOUND_FULL = 5;
const THUMP_LEVEL = 0.8;
// Minimum time between two thumps on the same wheel (s).
const THUMP_COOLDOWN = 0.12;
const SMOOTHING = 0.03;

/**
 * Rolling noise per surface, wind, suspension thumps. Reads the wheel
 * readouts each frame, sends the per-surface rolling intensities and the
 * speed to the chassis worklet, and turns fast suspension movements into
 * thump events (see `chassisProcessor.ts`).
 */
export class ChassisSoundBehavior extends Component {
    enabled = true;
    volume = VOLUME;
    rollLevel = ROLL_LEVEL;
    rollFullKmh = ROLL_FULL_KMH;
    rollExponent = ROLL_EXPONENT;
    windLevel = WIND_LEVEL;
    windFullKmh = WIND_FULL_KMH;
    thumpStart = THUMP_START;
    thumpFull = THUMP_FULL;
    reboundStart = REBOUND_START;
    reboundFull = REBOUND_FULL;
    thumpLevel = THUMP_LEVEL;
    /** Thumps fired so far, debug readout. */
    thumps = 0;

    private car!: CarBehavior;
    private ctx: AudioContext | null = null;
    private node: AudioWorkletNode | null = null;
    private master!: GainNode;
    private destroyed = false;
    private readonly intensities: number[] = SURFACES.map(() => 0);
    private readonly rows = SURFACES.map(() => ({ intensity: 0 }));
    private cooldown: number[] = [];

    override start(): void {
        const car = this.gameObject.findInScene(CarBehavior);
        if (!car) throw new Error('ChassisSoundBehavior: no CarBehavior in scene');
        this.car = car;
        this.cooldown = car.readouts.map(() => 0);
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
        const car = this.car;
        const speedFactor = Math.pow(
            Math.min(car.speedKmh / this.rollFullKmh, 1),
            this.rollExponent,
        );
        const counts = this.intensities;
        counts.fill(0);
        for (const readout of car.readouts) {
            if (readout.contact) counts[readout.surfaceId] = (counts[readout.surfaceId] ?? 0) + 1;
        }
        for (let i = 0; i < counts.length; i++) {
            const v = ((counts[i] ?? 0) / car.readouts.length) * speedFactor * this.rollLevel;
            counts[i] = v;
            const row = this.rows[i];
            if (row) row.intensity = v;
        }

        const thumps: { amp: number; hard: boolean }[] = [];
        for (const [i, readout] of car.readouts.entries()) {
            const left = (this.cooldown[i] ?? 0) - dt;
            this.cooldown[i] = left;
            if (left > 0) continue;
            let amp: number;
            let hard = false;
            if (readout.hardHit) {
                amp = 1;
                hard = true;
            } else if (readout.suspensionVelocity < 0) {
                amp = ramp(-readout.suspensionVelocity, this.thumpStart, this.thumpFull);
            } else {
                amp = ramp(readout.suspensionVelocity, this.reboundStart, this.reboundFull) * 0.5;
            }
            if (amp <= 0) continue;
            thumps.push({ amp: amp * this.thumpLevel, hard });
            this.cooldown[i] = THUMP_COOLDOWN;
            this.thumps++;
        }

        const ctx = this.ctx;
        const node = this.node;
        if (!ctx || !node) return;
        const message: Record<string, unknown> = {
            intensities: this.intensities,
            speed: car.speedKmh / 3.6,
        };
        if (thumps.length) message.thumps = thumps;
        node.port.postMessage(message);
        this.master.gain.setTargetAtTime(
            this.enabled ? this.volume : 0,
            ctx.currentTime,
            SMOOTHING,
        );
    }

    override registerDebug(gui: GUI): void {
        const f = gui.addFolder('Chassis sound');
        f.close();
        f.add(this, 'enabled').name('Enabled');
        f.add(this, 'volume', 0, 1, 0.05).name('Volume');
        const roll = f.addFolder('Rolling');
        roll.add(this, 'rollLevel', 0, 2, 0.05).name('Level');
        roll.add(this, 'rollFullKmh', 20, 200, 5).name('Full at (km/h)');
        roll.add(this, 'rollExponent', 0.5, 3, 0.1).name('Speed exponent');
        for (const [i, surface] of SURFACES.entries()) {
            const sf = roll.addFolder(surface.name);
            sf.close();
            const row = this.rows[i];
            if (row) sf.add(row, 'intensity', 0, 1, 0.01).name('Intensity').listen().disable();
            const push = (): void => {
                this.pushSurface(i, surface.rollSound);
            };
            const snd = surface.rollSound;
            sf.add(snd, 'hiss', 0, 2, 0.05).name('Roar level').onChange(push);
            sf.add(snd, 'hissFreq', 100, 5000, 50).name('Roar cutoff (Hz)').onChange(push);
            sf.add(snd, 'grainRate', 0, 2000, 10).name('Grains (/s)').onChange(push);
            sf.add(snd, 'grainDur', 0.001, 0.06, 0.001).name('Grain length (s)').onChange(push);
            sf.add(snd, 'grainLevel', 0, 2, 0.05).name('Grain level').onChange(push);
            sf.add(snd, 'rumble', 0, 2, 0.05).name('Rumble').onChange(push);
        }
        const wind = f.addFolder('Wind');
        const pushWind = (): void => {
            this.node?.port.postMessage({
                windLevel: this.windLevel,
                windFullSpeed: this.windFullKmh / 3.6,
            });
        };
        wind.add(this, 'windLevel', 0, 2, 0.05).name('Level').onChange(pushWind);
        wind.add(this, 'windFullKmh', 50, 300, 10).name('Full at (km/h)').onChange(pushWind);
        const susp = f.addFolder('Suspension');
        susp.add(this, 'thumpLevel', 0, 2, 0.05).name('Level');
        susp.add(this, 'thumpStart', 0.2, 5, 0.1).name('Compression start (m/s)');
        susp.add(this, 'thumpFull', 0.5, 10, 0.1).name('Compression full (m/s)');
        susp.add(this, 'reboundStart', 0.2, 5, 0.1).name('Rebound start (m/s)');
        susp.add(this, 'reboundFull', 0.5, 10, 0.1).name('Rebound full (m/s)');
        susp.add(this, 'thumps').name('Thumps').listen().disable();
        susp.add(
            {
                test: () => {
                    this.node?.port.postMessage({ thumps: [{ amp: this.thumpLevel, hard: true }] });
                },
            },
            'test',
        ).name('Test hard hit');
    }

    private pushSurface(index: number, params: RollSound): void {
        this.node?.port.postMessage({ index, params: { ...params } });
    }

    private async build(ctx: AudioContext): Promise<void> {
        await AudioHub.get().loadWorklet(ctx, 'chassis-processor', CHASSIS_PROCESSOR_SOURCE);
        if (this.destroyed) return;
        this.ctx = ctx;
        this.master = ctx.createGain();
        this.master.gain.value = 0;
        this.master.connect(ctx.destination);
        const node = new AudioWorkletNode(ctx, 'chassis-processor', {
            numberOfInputs: 0,
            outputChannelCount: [1],
        });
        node.connect(this.master);
        this.node = node;
        node.port.postMessage({
            surfaces: SURFACES.map((s) => ({ ...s.rollSound })),
            windLevel: this.windLevel,
            windFullSpeed: this.windFullKmh / 3.6,
        });
    }
}

function ramp(v: number, start: number, full: number): number {
    if (full <= start) return v >= full ? 1 : 0;
    return Math.min(Math.max((v - start) / (full - start), 0), 1);
}

export function createChassisSound(): GameObject {
    return new GameObject('chassisSound', [new ChassisSoundBehavior()]);
}
