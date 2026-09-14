import { ChassisSound } from '@car/audio/chassis-sound';
import { type SoundWorld, soundWorld, withFakeHub } from '@car/audio/sound-world.mock';
import { type FakeReadout } from '@car/render/readout.mock';
import { SLICK } from '@car/entity/surfaces/frozen-feels';

describe('ChassisSound', () => {
  let world: SoundWorld<ChassisSound>;
  let readout: FakeReadout;

  beforeEach(() => {
    withFakeHub();
    world = soundWorld(ChassisSound, (sound, made) => {
      sound.readout = made.readout;
      sound.feels = made.feels;
    });
    readout = world.readout;
  });

  it('rolls louder the faster it goes and the more wheels are down', async () => {
    world.sound.render?.(1 / 60);
    expect(world.hub.sent).toHaveLength(0);
    await world.ready();
    world.sound.render?.(1 / 60);
    expect(world.sound.intensities[0]).toBe(0);
    readout.state.speedKmh = 90;
    world.sound.render?.(1 / 60);
    const four = world.sound.intensities[0]!;
    expect(four).toBeCloseTo(1);
    readout.contacts[0]!.contact = false;
    readout.contacts[1]!.surface = SLICK;
    world.sound.render?.(1 / 60);
    expect(world.sound.intensities[0]).toBeLessThan(four);
  });

  it('thumps on a fast compression, clanks on the rebound and bangs when it bottoms out', async () => {
    await world.ready();
    readout.contacts[0]!.suspensionVelocity = -3;
    world.sound.render?.(1 / 60);
    const thumps = world.hub.last().thumps as { amp: number; hard: boolean }[];
    expect(thumps[0]?.hard).toBe(false);
    expect(thumps[0]?.amp).toBeGreaterThan(0);
    world.sound.render?.(1 / 60);
    expect(world.hub.last()).not.toHaveProperty('thumps');
    readout.contacts[0]!.suspensionVelocity = 0;
    world.sound.render?.(1);
    readout.contacts[0]!.suspensionVelocity = 6;
    world.sound.render?.(1 / 60);
    expect(world.hub.last()).toHaveProperty('thumps');
    readout.contacts[0]!.suspensionVelocity = 0;
    world.sound.render?.(1);
    readout.contacts[0]!.hardHit = true;
    world.sound.render?.(1 / 60);
    expect((world.hub.last().thumps as { hard: boolean }[])[0]?.hard).toBe(true);
    expect(world.sound.thumps).toBeGreaterThan(2);
  });

  it('never thumps below the threshold, and stays quiet when the thresholds collapse', async () => {
    await world.ready();
    readout.contacts[0]!.suspensionVelocity = -0.2;
    world.sound.render?.(1 / 60);
    expect(world.hub.last()).not.toHaveProperty('thumps');
    world.sound.thumpFull = world.sound.thumpStart;
    readout.contacts[0]!.suspensionVelocity = -0.2;
    world.sound.render?.(1 / 60);
    expect(world.hub.last()).not.toHaveProperty('thumps');
    readout.contacts[0]!.suspensionVelocity = -5;
    world.sound.render?.(1 / 60);
    expect(world.hub.last()).toHaveProperty('thumps');
  });

  it('takes the wind and one surface from the panel, tests a hit and lets go', async () => {
    await world.ready();
    world.sound.windLevel = 1.5;
    world.sound.tuneWind();
    expect(world.hub.last()).toMatchObject({ windLevel: 1.5 });
    world.sound.tune(0);
    expect(world.hub.last()).toMatchObject({ index: 0 });
    world.sound.tune(99);
    expect(world.hub.last()).toMatchObject({ index: 0 });
    world.sound.testHit();
    expect(world.hub.last()).toHaveProperty('thumps');
    world.sound.enabled = false;
    world.sound.render?.(1 / 60);
    expect(world.hub.levels.at(-1)).toBe(0);
    world.object.destroy();
    expect(world.hub.closed).toEqual(['chassis-processor']);
  });

  it('drops a voice that arrives after the page was left', async () => {
    world.object.destroy();
    await world.ready();
    expect(world.hub.closed).toEqual(['chassis-processor']);
  });
});
