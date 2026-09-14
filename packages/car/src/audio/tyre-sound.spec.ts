import { TyreSound } from '@car/audio/tyre-sound';
import { type SoundWorld, soundWorld, withFakeHub } from '@car/audio/sound-world.mock';
import { type FakeReadout } from '@car/render/readout.mock';
import { FIRM } from '@car/entity/surfaces/sealed-feels';
import { SLICK } from '@car/entity/surfaces/frozen-feels';

describe('TyreSound', () => {
  let world: SoundWorld<TyreSound>;
  let readout: FakeReadout;
  const slides = { wheelIntensity: [0, 0, 0, 0] };

  beforeEach(() => {
    withFakeHub();
    slides.wheelIntensity = [0, 0, 0, 0];
    world = soundWorld(TyreSound, (sound, made) => {
      sound.readout = made.readout;
      sound.slides = slides;
      sound.feels = made.feels;
    });
    readout = world.readout;
  });

  it('gives each surface of the palette its own voice and its own parameters', async () => {
    world.sound.render?.(1 / 60);
    expect(world.hub.sent).toHaveLength(0);
    await world.ready();
    expect(world.hub.opened).toEqual(['tyre-processor']);
    const surfaces = world.hub.sent[0]?.message.surfaces as { freq: number }[];
    expect(surfaces).toHaveLength(world.feels.length);
    expect(surfaces[0]?.freq).toBe(FIRM.slideSound.freq);
    world.sound.tune(1);
    expect(world.hub.last()).toMatchObject({ index: 1 });
    world.sound.tune(99);
    expect(world.hub.last()).toMatchObject({ index: 1 });
  });

  it('sings only past the audible threshold, and louder with two wheels than one', async () => {
    await world.ready();
    world.sound.render?.(1 / 60);
    expect(world.sound.intensities[0]).toBe(0);
    slides.wheelIntensity = [0.1, 0, 0, 0];
    world.sound.render?.(1 / 60);
    expect(world.sound.intensities[0]).toBe(0);
    slides.wheelIntensity = [0.6, 0, 0, 0];
    world.sound.render?.(1 / 60);
    const one = world.sound.intensities[0]!;
    expect(one).toBeGreaterThan(0);
    slides.wheelIntensity = [0.6, 0.6, 0, 0];
    world.sound.render?.(1 / 60);
    expect(world.sound.intensities[0]).toBeGreaterThan(one);
    expect(world.sound.wheelIntensity).toEqual(slides.wheelIntensity);
  });

  it('ignores a wheel in the air, a surface out of the palette and a shut-off threshold', async () => {
    await world.ready();
    slides.wheelIntensity = [1, 1, 1, 1];
    readout.contacts[0]!.contact = false;
    readout.contacts[1]!.surface = SLICK;
    world.sound.render?.(1 / 60);
    expect(world.sound.intensities[0]).toBeGreaterThan(0);
    world.sound.audibleFrom = 1;
    world.sound.render?.(1 / 60);
    expect(world.sound.intensities[0]).toBe(0);
    world.sound.enabled = false;
    world.sound.render?.(1 / 60);
    expect(world.hub.levels.at(-1)).toBe(0);
    world.object.destroy();
    expect(world.hub.closed).toEqual(['tyre-processor']);
  });

  it('drops a voice that arrives after the page was left', async () => {
    world.object.destroy();
    await world.ready();
    expect(world.hub.closed).toEqual(['tyre-processor']);
  });
});
