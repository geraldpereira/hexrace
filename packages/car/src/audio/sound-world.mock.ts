import { TestBed } from '@angular/core/testing';
import { type GameComponent, type GameObject, Scenes } from '@hexrace/engine';

import { AudioHub } from '@car/audio/audio-hub';
import { FakeAudioHub } from '@car/audio/audio-hub.mock';
import { Surfaces } from '@car/drive/surfaces';
import { type SurfaceFeel } from '@car/entity/surface-feel';
import { type FakeReadout, fakeReadout } from '@car/render/readout.mock';

export interface SoundWorld<T extends GameComponent> {
  hub: FakeAudioHub;
  readout: FakeReadout;
  feels: readonly SurfaceFeel[];
  sound: T;
  object: GameObject;
  ready(): Promise<void>;
}

export function withFakeHub(): void {
  TestBed.configureTestingModule({ providers: [{ provide: AudioHub, useClass: FakeAudioHub }] });
}

export function soundWorld<T extends GameComponent>(
  ctor: new () => T,
  setUp: (sound: T, world: { readout: FakeReadout; feels: readonly SurfaceFeel[] }) => void,
): SoundWorld<T> {
  const hub = TestBed.inject(AudioHub) as unknown as FakeAudioHub;
  const readout = fakeReadout();
  const feels = TestBed.inject(Surfaces).palette('europe');
  const scene = TestBed.inject(Scenes).create();
  const sound = scene.instantiate(ctor);
  setUp(sound, { readout, feels });
  const object = scene.spawn('sound');
  object.add(sound);
  scene.start();
  return {
    hub,
    readout,
    feels,
    sound,
    object,
    async ready(): Promise<void> {
      hub.unlock();
      await Promise.resolve();
      await Promise.resolve();
    },
  };
}
