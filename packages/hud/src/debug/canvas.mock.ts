export interface FakeContext {
  ctx: CanvasRenderingContext2D;
  calls: string[];
}

export function fakeContext(): FakeContext {
  const calls: string[] = [];
  const target: Record<string | symbol, unknown> = {};
  const ctx = new Proxy(target, {
    get: (t, key) => {
      if (key in t) return t[key];
      return (...args: unknown[]) => {
        calls.push(`${String(key)}(${args.map((a) => String(a)).join(',')})`);
      };
    },
    set: (t, key, value) => {
      t[key] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

export function mockCanvasContext(fake: FakeContext): void {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(fake.ctx);
}
