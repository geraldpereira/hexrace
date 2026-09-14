import { inject } from '@angular/core';

import { type WorkletSource } from '@car/audio/audio-hub';
import { SurfaceSound } from '@car/audio/surface-sound';
import { TyreWorklet } from '@car/audio/tyre-worklet';
import { type SlideReadout } from '@car/entity/car-readout';
import { type SurfaceFeel } from '@car/entity/surface-feel';

/**
 * The squeal, and it follows the marks exactly (POC 1): a tyre sings when, and only when, it
 * writes on the ground, one set of thresholds for both. The wheels on one surface are added as
 * independent noises, so two sliding wheels are louder than one and never past full. Set `slides`
 * to whatever measures the slide, which is the skid marks, along with `readout` and `feels`.
 */
export class TyreSound extends SurfaceSound implements SlideReadout {
  slides!: SlideReadout;
  audibleFrom = 0.2;

  private readonly tyre = inject(TyreWorklet);

  constructor() {
    super();
    this.volume = 0.6;
  }

  get wheelIntensity(): readonly number[] {
    return this.slides.wheelIntensity;
  }

  protected worklet(): WorkletSource {
    return this.tyre;
  }

  protected params(feel: SurfaceFeel): object {
    return { ...feel.slideSound };
  }

  protected measure(): object {
    const silence = this.feels.map(() => 1);
    for (const [i, contact] of this.readout.contacts.entries()) {
      if (!contact.contact) continue;
      const raw = this.slides.wheelIntensity[i]!;
      const weight = this.audibleFrom < 1 ? (raw - this.audibleFrom) / (1 - this.audibleFrom) : 0;
      if (weight <= 0) continue;
      const surface = this.feels.indexOf(contact.surface);
      if (surface < 0) continue;
      silence[surface] = silence[surface]! * (1 - weight);
    }
    for (const [i, quiet] of silence.entries()) this.intensities[i] = 1 - quiet;
    return {};
  }
}
