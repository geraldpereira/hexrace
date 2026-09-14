class FakeParam {
  value = 0;
  readonly targets: number[] = [];

  setTargetAtTime(value: number): void {
    this.value = value;
    this.targets.push(value);
  }
}

class FakeAudioNode {
  readonly outputs: unknown[] = [];

  connect(target: unknown): void {
    this.outputs.push(target);
  }

  disconnect(): void {
    this.outputs.length = 0;
  }
}

export class FakeGain extends FakeAudioNode {
  readonly gain = new FakeParam();
}

export class FakeFilter extends FakeAudioNode {
  type = '';
  readonly Q = new FakeParam();
  readonly frequency = new FakeParam();
}

class FakeWorkletNode extends FakeAudioNode {
  readonly messages: unknown[] = [];
  readonly port = {
    postMessage: (message: unknown): void => {
      this.messages.push(message);
    },
  };
}

export class FakeAudioContext {
  static readonly count = { built: 0 };
  state: AudioContextState = 'running';
  currentTime = 0;
  resumed = 0;
  readonly destination = new FakeAudioNode();
  readonly modules: string[] = [];
  readonly audioWorklet = {
    addModule: (url: string): Promise<void> => {
      this.modules.push(url);
      return Promise.resolve();
    },
  };

  constructor() {
    FakeAudioContext.count.built++;
  }

  createGain(): FakeGain {
    return new FakeGain();
  }

  createBiquadFilter(): FakeFilter {
    return new FakeFilter();
  }

  resume(): Promise<void> {
    this.resumed++;
    this.state = 'running';
    return Promise.resolve();
  }
}

export interface FakeAudio {
  nodes: FakeWorkletNode[];
  context(): FakeAudioContext | null;
}

export function installAudio(): FakeAudio {
  const nodes: FakeWorkletNode[] = [];
  const made: FakeAudioContext[] = [];
  FakeAudioContext.count.built = 0;
  vi.stubGlobal(
    'AudioContext',
    class extends FakeAudioContext {
      constructor() {
        super();
        made.push(this);
      }
    },
  );
  vi.stubGlobal(
    'AudioWorkletNode',
    class extends FakeWorkletNode {
      constructor() {
        super();
        nodes.push(this);
      }
    },
  );
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: () => 'blob:fake',
    revokeObjectURL: () => undefined,
  });
  return { nodes, context: () => made[0] ?? null };
}
