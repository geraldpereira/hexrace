import { inject } from '@angular/core';

import { type WorkletSource } from '@car/audio/audio-hub';
import { ChassisWorklet } from '@car/audio/chassis-worklet';
import { SurfaceSound } from '@car/audio/surface-sound';
import { Ramps } from '@car/drive/ramps';
import { type SurfaceFeel } from '@car/entity/surface-feel';

const THUMP_COOLDOWN = 0.12;

interface Thump {
  amp: number;
  hard: boolean;
}

/**
 * The rest of the car's noise (POC 1): the rolling, dosed by how many wheels are on a surface and
 * how fast; the wind, which opens and swells with speed; and the suspension, a thump on every fast
 * compression, a lighter clank on the rebound, and a hard metallic hit when it bottoms out, each
 * wheel muted for a moment after one so a rough surface does not turn into a drum roll.
 */
export class ChassisSound extends SurfaceSound {
  rollLevel = 1;
  rollFullKmh = 90;
  rollExponent = 1.4;
  windLevel = 0.9;
  windFullKmh = 150;
  thumpStart = 1;
  thumpFull = 3.5;
  reboundStart = 1.8;
  reboundFull = 5;
  thumpLevel = 0.8;
  /** Thumps fired since the car was built. */
  thumps = 0;

  private readonly chassis = inject(ChassisWorklet);
  private readonly ramps = inject(Ramps);
  private readonly cooldown: number[] = [];

  /** Pushes the wind knobs: a level and the speed at which it is full. */
  tuneWind(): void {
    this.hub.send(this.voice, {
      windLevel: this.windLevel,
      windFullSpeed: this.windFullKmh / 3.6,
    });
  }

  /** Fires one hard hit on demand: the panel's test button. */
  testHit(): void {
    this.hub.send(this.voice, { thumps: [{ amp: this.thumpLevel, hard: true }] });
  }

  protected worklet(): WorkletSource {
    return this.chassis;
  }

  protected params(feel: SurfaceFeel): object {
    return { ...feel.rollSound };
  }

  protected override setUp(): void {
    this.cooldown.push(...Array.from<number>({ length: this.readout.contacts.length }).fill(0));
  }

  protected override opened(): void {
    this.tuneWind();
  }

  protected measure(dt: number): object {
    this.roll();
    const thumps = this.suspension(dt);
    return thumps.length > 0 ? { thumps } : {};
  }

  private roll(): void {
    const state = this.readout.state;
    const factor = Math.pow(Math.min(state.speedKmh / this.rollFullKmh, 1), this.rollExponent);
    const counts = this.feels.map(() => 0);
    for (const contact of this.readout.contacts) {
      if (!contact.contact) continue;
      const surface = this.feels.indexOf(contact.surface);
      if (surface >= 0) counts[surface] = counts[surface]! + 1;
    }
    const wheels = this.readout.contacts.length;
    for (const [i, count] of counts.entries()) {
      this.intensities[i] = (count / wheels) * factor * this.rollLevel;
    }
  }

  private suspension(dt: number): Thump[] {
    const thumps: Thump[] = [];
    for (const [i, contact] of this.readout.contacts.entries()) {
      const left = this.cooldown[i]! - dt;
      this.cooldown[i] = left;
      if (left > 0) continue;
      const hard = contact.hardHit;
      let amp = 1;
      if (!hard && contact.suspensionVelocity < 0) {
        amp = this.ramps.at(-contact.suspensionVelocity, this.thumpStart, this.thumpFull);
      } else if (!hard) {
        amp = this.ramps.at(contact.suspensionVelocity, this.reboundStart, this.reboundFull) * 0.5;
      }
      if (amp <= 0) continue;
      thumps.push({ amp: amp * this.thumpLevel, hard });
      this.cooldown[i] = THUMP_COOLDOWN;
      this.thumps++;
    }
    return thumps;
  }
}
