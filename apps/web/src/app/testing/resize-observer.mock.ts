export interface FrameBox {
  readonly width: number;
  readonly height: number;
}

export interface ResizeControl {
  resize(width: number, height: number): void;
}

export function stubResizeObserver(initial?: FrameBox): ResizeControl {
  const callbacks: ResizeObserverCallback[] = [];
  const fire = (cb: ResizeObserverCallback, box: FrameBox): void => {
    cb([{ contentRect: box } as ResizeObserverEntry], {} as ResizeObserver);
  };
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private readonly cb: ResizeObserverCallback) {
        callbacks.push(cb);
      }

      observe(): void {
        if (initial) queueMicrotask(() => fire(this.cb, initial));
      }

      disconnect(): void {
        callbacks.length = 0;
      }
    },
  );
  return {
    resize(width: number, height: number): void {
      for (const cb of callbacks) fire(cb, { width, height });
    },
  };
}
