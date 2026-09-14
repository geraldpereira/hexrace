import { EngineSound } from '@car/audio/engine-sound';
import { type SoundWorld, soundWorld, withFakeHub } from '@car/audio/sound-world.mock';
import { type FakeReadout } from '@car/render/readout.mock';

describe('EngineSound', () => {
  let world: SoundWorld<EngineSound>;
  let readout: FakeReadout;

  beforeEach(() => {
    withFakeHub();
    world = soundWorld(EngineSound, (sound, made) => {
      sound.readout = made.readout;
    });
    readout = world.readout;
    readout.state.maxRpm = 4500;
  });

  it('says nothing before the first gesture, then feeds the worklet every frame', async () => {
    readout.state.rpm = 2000;
    world.sound.render?.(1 / 60);
    expect(world.hub.sent).toHaveLength(0);
    await world.ready();
    expect(world.hub.opened).toEqual(['engine-processor']);
    expect(world.hub.last()).toHaveProperty('cylinders', 4);
    readout.state.throttle = 1;
    world.sound.render?.(1 / 60);
    expect(world.hub.last()).toMatchObject({ rpm: 2000, load: 1 });
    expect(world.hub.cutoffs.at(-1)).toBeGreaterThan(600);
    expect(world.hub.levels.at(-1)).toBe(0.5);
    world.sound.enabled = false;
    world.sound.render?.(1 / 60);
    expect(world.hub.levels.at(-1)).toBe(0);
  });

  it('sends the limiter as an edge and lifts the load while a gear goes in', async () => {
    await world.ready();
    readout.state.limiter = true;
    world.sound.render?.(1 / 60);
    expect(world.hub.last()).toHaveProperty('limiter', true);
    world.sound.render?.(1 / 60);
    expect(world.hub.last()).not.toHaveProperty('limiter');
    readout.state.shifting = true;
    readout.state.throttle = 1;
    world.sound.render?.(1 / 60);
    expect(world.hub.last()).toHaveProperty('load', 0.5);
  });

  it('bangs on a lifted downshift, crackles on the overrun and pops on demand', async () => {
    await world.ready();
    readout.state.rpm = 4000;
    readout.state.throttle = 1;
    world.sound.render?.(1 / 60);
    readout.state.gear = 4;
    world.sound.render?.(1 / 60);
    readout.state.gear = 3;
    readout.state.throttle = 0;
    world.sound.render?.(1 / 60);
    expect(world.hub.last()).toHaveProperty('pops');
    world.sound.overrunRate = 1000;
    world.sound.render?.(1 / 60);
    expect(world.hub.last()).toHaveProperty('pops');
    world.sound.testPops();
    expect(world.hub.last()).toEqual({ pops: 2 });
  });

  it('lets its voice go when the page is left', async () => {
    await world.ready();
    world.object.destroy();
    expect(world.hub.closed).toEqual(['engine-processor']);
    world.sound.render?.(1 / 60);
    expect(world.hub.sent.filter((one) => 'rpm' in one.message)).toHaveLength(0);
  });

  it('drops a voice that arrives after the page was left, and lives without one at all', async () => {
    world.object.destroy();
    await world.ready();
    expect(world.hub.closed).toEqual(['engine-processor']);
    world.hub.allowed = false;
    const quiet = soundWorld(EngineSound, (sound, made) => {
      sound.readout = made.readout;
    });
    await quiet.ready();
    quiet.sound.render?.(1 / 60);
    expect(quiet.hub.sent).toHaveLength(0);
  });
});
