import type GUI from 'lil-gui';
import { Component, GameObject } from '../../engine/gameObject';
import { AudioHub } from '../../engine/audio/audioHub';
import { CarBehavior } from './carBehavior';
import { SkidMarksBehavior } from '../rendering/skidMarks';
import { SURFACES, type SlideSound } from '../terrain/surfaces';
import { TYRE_PROCESSOR_SOURCE } from './tyreProcessor';

const VOLUME = 0.6;
const SMOOTHING = 0.03;
// Slide intensity below which the tyre stays silent; above it the range is
// stretched back to 0..1 so a full slide is still full.
const AUDIBLE_FROM = 0.2;

/**
 * Tyre slide noise: follows the skid marks exactly. Each wheel's slide
 * intensity comes from `SkidMarksBehavior` (one set of thresholds, in its
 * debug folder), so a tyre squeals when, and only when, it marks the
 * ground. The wheels are added up per surface and the intensities fed to
 * an AudioWorklet with one voice per surface (see `tyreProcessor.ts`). The
 * surface parameters live in `surfaces.ts`.
 */
export class TyreSoundBehavior extends Component {
    enabled = true;
    volume = VOLUME;
    audibleFrom = AUDIBLE_FROM;
    /** Per-surface slide intensity this frame. */
    readonly intensities: number[] = SURFACES.map(() => 0);
    /** Same, as rows lil-gui can listen to. */
    private readonly rows = SURFACES.map(() => ({ intensity: 0 }));

    private car!: CarBehavior;
    private skidMarks!: SkidMarksBehavior;
    private ctx: AudioContext | null = null;
    private node: AudioWorkletNode | null = null;
    private master!: GainNode;
    private destroyed = false;

    override start(): void {
        const car = this.gameObject.findInScene(CarBehavior);
        if (!car) throw new Error('TyreSoundBehavior: no CarBehavior in scene');
        this.car = car;
        const skidMarks = this.gameObject.findInScene(SkidMarksBehavior);
        if (!skidMarks) throw new Error('TyreSoundBehavior: no SkidMarksBehavior in scene');
        this.skidMarks = skidMarks;
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

    override render(): void {
        const car = this.car;
        // Combine the wheels on each surface as independent noise sources:
        // 1 - Π(1 - w), so two sliding wheels are louder than one, never past 1.
        const silence = this.intensities;
        silence.fill(1);
        // Skid marks render before us (scene order), so their intensities are current.
        for (const [i, readout] of car.readouts.entries()) {
            if (!readout.contact) continue;
            const raw = this.skidMarks.wheelIntensity[i] ?? 0;
            const w = this.audibleFrom < 1 ? (raw - this.audibleFrom) / (1 - this.audibleFrom) : 0;
            if (w <= 0) continue;
            const id = readout.surfaceId;
            silence[id] = (silence[id] ?? 1) * (1 - w);
        }
        for (let i = 0; i < silence.length; i++) {
            const v = 1 - (silence[i] ?? 1);
            silence[i] = v;
            const row = this.rows[i];
            if (row) row.intensity = v;
        }

        const ctx = this.ctx;
        const node = this.node;
        if (!ctx || !node) return;
        node.port.postMessage({ intensities: this.intensities, speed: car.speedKmh / 3.6 });
        this.master.gain.setTargetAtTime(
            this.enabled ? this.volume : 0,
            ctx.currentTime,
            SMOOTHING,
        );
    }

    override registerDebug(gui: GUI): void {
        const f = gui.addFolder('Tyre sound');
        f.close();
        f.add(this, 'enabled').name('Enabled');
        f.add(this, 'volume', 0, 1, 0.05).name('Volume');
        f.add(this, 'audibleFrom', 0, 0.9, 0.05).name('Audible from (intensity)');
        for (const [i, surface] of SURFACES.entries()) {
            const sf = f.addFolder(surface.name);
            sf.close();
            const row = this.rows[i];
            if (row)
                sf.add(row, 'intensity', 0, 1, 0.01).name('Slide intensity').listen().disable();
            const push = (): void => {
                this.pushSurface(i, surface.slideSound);
            };
            const snd = surface.slideSound;
            sf.add(snd, 'tone', 0, 1, 0.05).name('Tone (0 crunch → 1 squeal)').onChange(push);
            sf.add(snd, 'freq', 100, 4000, 10).name('Frequency (Hz)').onChange(push);
            sf.add(snd, 'q', 0.5, 30, 0.5).name('Squeal Q').onChange(push);
            sf.add(snd, 'grainRate', 0, 2000, 10).name('Grains (/s)').onChange(push);
            sf.add(snd, 'grainDur', 0.001, 0.06, 0.001).name('Grain length (s)').onChange(push);
            sf.add(snd, 'level', 0, 2, 0.05).name('Level').onChange(push);
        }
    }

    private pushSurface(index: number, params: SlideSound): void {
        this.node?.port.postMessage({ index, params: { ...params } });
    }

    private async build(ctx: AudioContext): Promise<void> {
        await AudioHub.get().loadWorklet(ctx, 'tyre-processor', TYRE_PROCESSOR_SOURCE);
        if (this.destroyed) return;
        this.ctx = ctx;

        this.master = ctx.createGain();
        this.master.gain.value = 0;
        this.master.connect(ctx.destination);
        const node = new AudioWorkletNode(ctx, 'tyre-processor', {
            numberOfInputs: 0,
            outputChannelCount: [1],
        });
        node.connect(this.master);
        this.node = node;
        node.port.postMessage({ surfaces: SURFACES.map((s) => ({ ...s.slideSound })) });
    }
}

export function createTyreSound(): GameObject {
    return new GameObject('tyreSound', [new TyreSoundBehavior()]);
}
