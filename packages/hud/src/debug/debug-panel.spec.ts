import { TestBed } from '@angular/core/testing';
import { type GUI } from 'lil-gui';

import { DebugPanel } from '@hud/debug/debug-panel';
import { PerfMeter } from '@hud/debug/perf-meter';

describe('DebugPanel', () => {
  let panel: DebugPanel;
  let frames: FrameRequestCallback[];

  beforeEach(() => {
    localStorage.clear();
    document.body.replaceChildren();
    frames = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      frames.push(cb);
      return frames.length;
    });
    TestBed.configureTestingModule({});
    panel = TestBed.inject(DebugPanel);
  });

  function controller(folder: GUI, name: string) {
    return folder.controllers.find((c) => c._name === name);
  }

  it('is not on the page until something registers, then hidden until shown', () => {
    expect(document.querySelector('.lil-gui')).toBeNull();
    panel.register('Test', () => undefined);
    const root = document.querySelector<HTMLElement>('.lil-gui')!;
    expect(root.style.display).toBe('none');
    panel.show();
    expect(root.style.display).toBe('');
    expect(panel.visible()).toBe(true);
    panel.toggle();
    expect(root.style.display).toBe('none');
    panel.toggle();
    expect(panel.visible()).toBe(true);
  });

  it('toggles with the backquote key', () => {
    panel.register('Test', () => undefined);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backquote' }));
    expect(panel.visible()).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
    expect(panel.visible()).toBe(true);
  });

  it('restores a folder from storage, saves it on change, and resets it', () => {
    localStorage.setItem('hexrace.debug.Tuning', JSON.stringify({ gain: 0.8 }));
    const subject = { gain: 0.2 };
    const folder = panel.register('Tuning', (f) => {
      f.add(subject, 'gain', 0, 1);
    });
    expect(subject.gain).toBe(0.8);

    const gain = controller(folder, 'gain');
    gain?.setValue(0.5);
    (gain as unknown as { _callOnFinishChange(): void })._callOnFinishChange();
    expect(JSON.parse(localStorage.getItem('hexrace.debug.Tuning') ?? '{}')).toEqual({ gain: 0.5 });

    (controller(folder, 'Reset folder')?.getValue() as () => void)();
    expect(subject.gain).toBe(0.2);
    expect(localStorage.getItem('hexrace.debug.Tuning')).toBeNull();
  });

  it('destroys the folder with its owner', () => {
    const destroy: (() => void)[] = [];
    const destroyRef = { onDestroy: (cb: () => void) => destroy.push(cb) };
    const folder = panel.register('Owned', () => undefined, destroyRef as never);
    expect(folder.domElement.isConnected).toBe(true);
    destroy.forEach((cb) => cb());
    expect(folder.domElement.isConnected).toBe(false);
  });

  it('carries the performance meter, the corner toggle, a copy and a reset of everything', () => {
    const write = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: write },
    });
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const subject = { gain: 0.2 };
    localStorage.setItem('hexrace.debug.Other', '{}');
    const folder = panel.register('Tuning', (f) => {
      f.add(subject, 'gain', 0, 1);
    });
    controller(folder, 'gain')?.setValue(0.9);

    const root = folder.parent;
    const perf = root.folders.find((f) => f._title === 'Performance')!;
    controller(perf, 'Corner overlay')?.setValue(true);
    expect(TestBed.inject(PerfMeter).cornerVisible()).toBe(true);
    TestBed.inject(PerfMeter).fps = 42;
    [...frames].forEach((cb) => cb(16));
    expect(perf.$children.querySelector('canvas')).not.toBeNull();

    (controller(root, 'Copy values as JSON')?.getValue() as () => void)();
    expect(write).toHaveBeenCalledWith(expect.stringContaining('"current": 0.9'));
    expect(log).toHaveBeenCalled();

    (controller(root, 'Reset all')?.getValue() as () => void)();
    expect(subject.gain).toBe(0.2);
    expect(localStorage.getItem('hexrace.debug.Other')).toBeNull();
  });
});
