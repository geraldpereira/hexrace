import { type Voice, type WorkletSource } from '@car/audio/audio-hub';

export interface Sent {
  readonly name: string;
  readonly message: Record<string, unknown>;
}

export class FakeAudioHub {
  ready = false;
  readonly opened: string[] = [];
  readonly sent: Sent[] = [];
  readonly levels: number[] = [];
  readonly cutoffs: number[] = [];
  readonly closed: string[] = [];
  allowed = true;

  private waiting: ((context: AudioContext) => void)[] = [];

  whenReady(then: (context: AudioContext) => void): void {
    if (this.ready) then({} as AudioContext);
    else this.waiting.push(then);
  }

  unlock(): void {
    this.ready = true;
    for (const then of this.waiting) then({} as AudioContext);
    this.waiting = [];
  }

  open(_context: AudioContext, name: string): Promise<Voice | null> {
    this.opened.push(name);
    return Promise.resolve(this.allowed ? ({ name } as unknown as Voice) : null);
  }

  async openFor(
    context: AudioContext,
    worklet: WorkletSource,
    _filtered: boolean,
    gone: () => boolean,
  ): Promise<Voice | null> {
    const voice = await this.open(context, worklet.name);
    if (!gone()) return voice;
    this.close(voice);
    return null;
  }

  surface(voice: Voice | null, index: number, params: object): void {
    this.send(voice, { index, params });
  }

  send(voice: Voice | null, message: object): void {
    const record = message as Record<string, unknown>;
    if (voice)
      this.sent.push({ name: (voice as unknown as { name: string }).name, message: record });
  }

  level(voice: Voice | null, value: number): void {
    if (voice) this.levels.push(value);
  }

  cutoff(voice: Voice | null, hz: number): void {
    if (voice) this.cutoffs.push(hz);
  }

  close(voice: Voice | null): void {
    if (voice) this.closed.push((voice as unknown as { name: string }).name);
  }

  last(): Record<string, unknown> {
    return this.sent.at(-1)?.message ?? {};
  }
}
