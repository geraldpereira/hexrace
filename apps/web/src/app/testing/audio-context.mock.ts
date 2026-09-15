class BareAudioContext {
  state = 'running';
}

export function stubAudioContext(): void {
  vi.stubGlobal('AudioContext', BareAudioContext);
}
