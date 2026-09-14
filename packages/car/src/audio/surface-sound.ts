import { inject } from '@angular/core';
import { GameComponent } from '@hexrace/engine';

import { AudioHub, type Voice, type WorkletSource } from '@car/audio/audio-hub';
import { type CarReadout } from '@car/entity/car-readout';
import { type SurfaceFeel } from '@car/entity/surface-feel';

/**
 * What the tyre noise and the rolling noise have in common: a worklet with one voice per rank of
 * the palette, an intensity per rank sent every frame with the speed, and one surface's parameters
 * pushed alone when the panel changes them. A subclass names its worklet, says which half of a
 * `SurfaceFeel` its voices read (`params`), and fills the intensities in `measure`, whose result
 * joins the message; `setUp` and `opened` are there for the rest. Set `readout` and `feels`.
 */
export abstract class SurfaceSound extends GameComponent {
  readout!: CarReadout;
  feels: readonly SurfaceFeel[] = [];
  enabled = true;
  volume = 0.5;
  /** Intensity per surface of the palette, what each voice is being given this frame. */
  readonly intensities: number[] = [];

  protected readonly hub = inject(AudioHub);
  protected voice: Voice | null = null;
  private dead = false;

  override start(): void {
    this.intensities.push(...Array.from<number>({ length: this.feels.length }).fill(0));
    this.setUp();
    this.hub.whenReady((context: AudioContext) => {
      void this.open(context);
    });
  }

  /** Pushes one surface's parameters into its voice; the panel calls it on a change. */
  tune(index: number): void {
    const feel = this.feels[index];
    if (feel) this.hub.surface(this.voice, index, this.params(feel));
  }

  override render(dt: number): void {
    const extra = this.measure(dt);
    if (!this.voice) return;
    const speed = this.readout.state.speedKmh / 3.6;
    this.hub.send(this.voice, { intensities: this.intensities, speed, ...extra });
    this.hub.level(this.voice, this.enabled ? this.volume : 0);
  }

  override onDestroy(): void {
    this.dead = true;
    this.hub.close(this.voice);
    this.voice = null;
  }

  protected abstract worklet(): WorkletSource;

  protected abstract params(feel: SurfaceFeel): object;

  protected abstract measure(dt: number): object;

  protected setUp(): void {
    return;
  }

  /** Run once the voice exists, for whatever else the worklet has to be told at the start. */
  protected opened(): void {
    return;
  }

  private async open(context: AudioContext): Promise<void> {
    const voice = await this.hub.openFor(context, this.worklet(), false, () => this.dead);
    if (!voice) return;
    this.voice = voice;
    this.hub.send(voice, { surfaces: this.feels.map((feel: SurfaceFeel) => this.params(feel)) });
    this.opened();
  }
}
