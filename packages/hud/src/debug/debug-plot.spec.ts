import { GUI } from 'lil-gui';

import { fakeContext, mockCanvasContext } from '@hud/debug/canvas.mock';
import { DebugPlot, addPlot } from '@hud/debug/debug-plot';

describe('DebugPlot', () => {
  let frames: FrameRequestCallback[];

  beforeEach(() => {
    frames = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      frames.push(cb);
      return frames.length;
    });
  });

  it('keeps a rolling window of samples', () => {
    const plot = new DebugPlot({ label: 'x', min: 0, max: 1, seconds: 0.05, sample: () => 0.5 });
    for (let i = 0; i < 10; i++) plot.push(i);
    expect(plot.values).toEqual([7, 8, 9]);
  });

  it('samples every frame while on the page and stops a second after leaving it', () => {
    const gui = new GUI({ autoPlace: false, container: document.body });
    let value = 0;
    const plot = addPlot(gui, { label: 'x', min: 0, max: 10, sample: () => value++ });
    frames[0]?.(0);
    frames[1]?.(16);
    expect(plot.values).toEqual([0, 1]);
    gui.destroy();
    frames[2]?.(32);
    frames[3]?.(1500);
    expect(plot.values).toEqual([0, 1]);
    expect(frames.length).toBe(4);
  });

  it('draws the window and the latest value when it has a context', () => {
    const fake = fakeContext();
    mockCanvasContext(fake);
    const plot = new DebugPlot({ label: 'x', min: 0, max: 10, sample: () => 1 });
    plot.push(2.5);
    plot.push(7);
    expect(fake.calls.filter((c) => c.startsWith('fillRect')).length).toBe(2);
    expect(fake.calls.at(-1)).toMatch(/^fillText\(7\.0,/);
  });

  it('stops when told', () => {
    const plot = new DebugPlot({ label: 'x', min: 0, max: 1, sample: () => 1 });
    plot.stop();
    frames[0]?.(0);
    expect(plot.values).toEqual([]);
    expect(frames.length).toBe(1);
  });
});
