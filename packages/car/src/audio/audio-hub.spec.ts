import { TestBed } from '@angular/core/testing';

import { AudioHub } from '@car/audio/audio-hub';
import { EngineWorklet } from '@car/audio/engine-worklet';
import { type FakeAudio, FakeAudioContext, installAudio } from '@car/audio/audio.mock';

describe('AudioHub', () => {
  let audio: FakeAudio;
  let hub: AudioHub;

  beforeEach(() => {
    audio = installAudio();
    hub = TestBed.inject(AudioHub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('waits for a gesture, then hands the context to everyone waiting', () => {
    const seen: AudioContext[] = [];
    hub.whenReady((context) => seen.push(context));
    expect(hub.ready).toBe(false);
    expect(seen).toHaveLength(0);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    expect(hub.ready).toBe(true);
    expect(seen).toHaveLength(1);
    hub.whenReady((context) => seen.push(context));
    expect(seen).toHaveLength(2);
  });

  it('resumes a suspended context instead of making a second one', () => {
    hub.unlock();
    const context = audio.context()!;
    hub.unlock();
    expect(context.resumed).toBe(0);
    context.state = 'suspended';
    hub.unlock();
    expect(context.resumed).toBe(1);
    expect(FakeAudioContext.count.built).toBe(1);
  });

  it('loads a worklet once per name and wires the voice to the speakers', async () => {
    hub.unlock();
    const context = audio.context() as unknown as AudioContext;
    const worklet = TestBed.inject(EngineWorklet);
    const first = await hub.open(context, worklet.name, worklet.source, true);
    const second = await hub.open(context, worklet.name, worklet.source, false);
    expect(audio.context()!.modules).toHaveLength(1);
    expect(first?.filter).not.toBeNull();
    expect(second?.filter).toBeNull();
    hub.send(first, { rpm: 1200 });
    hub.level(first, 0.4);
    hub.cutoff(first, 900);
    expect(audio.nodes[0]?.messages).toEqual([{ rpm: 1200 }]);
    expect(first?.gain.gain.value).toBe(0.4);
    expect(first?.filter?.frequency.value).toBe(900);
    hub.surface(first, 2, { level: 1 });
    expect(audio.nodes[0]?.messages.at(-1)).toEqual({ index: 2, params: { level: 1 } });
    hub.close(first);
    expect(audio.nodes[0]?.outputs).toHaveLength(0);
  });

  it('drops a voice whose owner went away while the worklet was loading', async () => {
    hub.unlock();
    const context = audio.context() as unknown as AudioContext;
    const worklet = TestBed.inject(EngineWorklet);
    const kept = await hub.openFor(context, worklet, false, () => false);
    expect(kept).not.toBeNull();
    const dropped = await hub.openFor(context, worklet, false, () => true);
    expect(dropped).toBeNull();
    expect(audio.nodes[1]?.outputs).toHaveLength(0);
  });

  it('is supported only where worklets exist, on a secure origin', () => {
    vi.stubGlobal('isSecureContext', true);
    expect(hub.supported).toBe(true);
    vi.stubGlobal('isSecureContext', false);
    expect(hub.supported).toBe(false);
    vi.stubGlobal('isSecureContext', true);
    vi.stubGlobal('AudioWorkletNode', undefined);
    expect(hub.supported).toBe(false);
  });

  it('does nothing at all in a page without Web Audio', async () => {
    vi.unstubAllGlobals();
    vi.stubGlobal('AudioContext', undefined);
    vi.stubGlobal('AudioWorkletNode', undefined);
    const bare = TestBed.inject(AudioHub);
    bare.unlock();
    expect(bare.ready).toBe(false);
    expect(await bare.open({} as AudioContext, 'x', 'y', false)).toBeNull();
    bare.send(null, {});
    bare.level(null, 1);
    bare.cutoff(null, 1);
    bare.close(null);
  });
});
