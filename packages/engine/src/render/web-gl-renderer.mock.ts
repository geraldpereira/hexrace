export const webGlCalls: string[] = [];

export class FakeWebGLRenderer {
  readonly shadowMap = { enabled: false };

  constructor(readonly parameters: { canvas: HTMLCanvasElement }) {
    webGlCalls.push('create');
  }

  setPixelRatio(ratio: number): void {
    webGlCalls.push(`ratio ${ratio}`);
  }

  setSize(w: number, h: number, updateStyle: boolean): void {
    webGlCalls.push(`size ${w}x${h} ${updateStyle}`);
  }

  render(): void {
    webGlCalls.push('render');
  }

  dispose(): void {
    webGlCalls.push('dispose');
  }
}
