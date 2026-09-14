import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

const SMOOTHING = 0.03;

/** One worklet running: its node, the gain it goes through, and the low-pass when it has one. */
export interface Voice {
  readonly context: AudioContext;
  readonly node: AudioWorkletNode;
  readonly gain: GainNode;
  readonly filter: BiquadFilterNode | null;
}

/** A worklet ready to load: the name it registers under and its source text. */
export interface WorkletSource {
  readonly name: string;
  readonly source: string;
}

interface AudioWindow {
  AudioContext?: new () => AudioContext;
  AudioWorkletNode?: new (
    context: AudioContext,
    name: string,
    options: AudioWorkletNodeOptions,
  ) => AudioWorkletNode;
}

/**
 * The one place the game touches Web Audio. The context is born on the first key or click, which
 * every browser demands and which a gamepad does not count as; whoever wants it registers with
 * `whenReady`. Worklet code is loaded from its source text through a Blob URL, once per name, so
 * there is no asset to ship. Without an `AudioContext` in the page nothing happens and nothing
 * throws, which is how a test, and a browser that refuses audio, get through.
 */
@Injectable({ providedIn: 'root' })
export class AudioHub {
  private readonly window = inject(DOCUMENT).defaultView as (Window & AudioWindow) | null;
  private context: AudioContext | null = null;
  private readonly waiting: ((context: AudioContext) => void)[] = [];
  private readonly modules = new Map<string, Promise<void>>();

  constructor() {
    const gesture = (): void => {
      this.unlock();
    };
    this.window?.addEventListener('keydown', gesture);
    this.window?.addEventListener('pointerdown', gesture);
  }

  get ready(): boolean {
    return this.context !== null;
  }

  /** Runs `then` with the context as soon as there is one, at once if there already is. */
  whenReady(then: (context: AudioContext) => void): void {
    if (this.context) then(this.context);
    else this.waiting.push(then);
  }

  /** Starts the audio, or resumes it; the page's first gesture calls this on its own. */
  unlock(): void {
    if (this.context) {
      if (this.context.state === 'suspended') void this.context.resume();
      return;
    }
    const Ctor = this.window?.AudioContext;
    if (!Ctor) return;
    const context = new Ctor();
    this.context = context;
    for (const then of this.waiting) then(context);
    this.waiting.length = 0;
  }

  /** Loads a worklet, builds its node and wires it to the speakers; null when audio is refused. */
  async open(
    context: AudioContext,
    name: string,
    source: string,
    filtered: boolean,
  ): Promise<Voice | null> {
    const Ctor = this.window?.AudioWorkletNode;
    if (!Ctor) return null;
    await this.load(context, name, source);
    const gain = context.createGain();
    gain.gain.value = 0;
    gain.connect(context.destination);
    const filter = filtered ? context.createBiquadFilter() : null;
    if (filter) {
      filter.type = 'lowpass';
      filter.Q.value = 0.8;
      filter.connect(gain);
    }
    const node = new Ctor(context, name, { numberOfInputs: 0, outputChannelCount: [1] });
    node.connect(filter ?? gain);
    return { context, node, gain, filter };
  }

  /** Opens a worklet's voice, unless the caller has gone away meanwhile; then it is closed. */
  async openFor(
    context: AudioContext,
    worklet: WorkletSource,
    filtered: boolean,
    gone: () => boolean,
  ): Promise<Voice | null> {
    const voice = await this.open(context, worklet.name, worklet.source, filtered);
    if (!gone()) return voice;
    this.close(voice);
    return null;
  }

  /** Sends one surface's parameters to the voice that plays it. */
  surface(voice: Voice | null, index: number, params: object): void {
    this.send(voice, { index, params });
  }

  send(voice: Voice | null, message: object): void {
    voice?.node.port.postMessage(message);
  }

  /** Eases the voice's level towards `value`, so a change never clicks. */
  level(voice: Voice | null, value: number): void {
    voice?.gain.gain.setTargetAtTime(value, voice.context.currentTime, SMOOTHING);
  }

  cutoff(voice: Voice | null, hz: number): void {
    voice?.filter?.frequency.setTargetAtTime(hz, voice.context.currentTime, SMOOTHING);
  }

  close(voice: Voice | null): void {
    voice?.node.disconnect();
  }

  private load(context: AudioContext, name: string, source: string): Promise<void> {
    let pending = this.modules.get(name);
    if (pending) return pending;
    const url = URL.createObjectURL(new Blob([source], { type: 'application/javascript' }));
    pending = context.audioWorklet.addModule(url).finally(() => {
      URL.revokeObjectURL(url);
    });
    this.modules.set(name, pending);
    return pending;
  }
}
