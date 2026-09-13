import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { GamepadSource, KeyboardSource, TouchSource, provideInputSources } from '@hexrace/inputs';

import { InputsShowcase } from '@ui/lab/inputs/inputs-showcase';

describe('InputsShowcase', () => {
  let frames: FrameRequestCallback[];

  beforeEach(() => {
    frames = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      frames.push(cb);
      return frames.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
  });

  afterEach(() => {
    window.dispatchEvent(new Event('blur'));
  });

  async function render(): Promise<{ host: HTMLElement; page: InputsShowcase }> {
    await TestBed.configureTestingModule({
      imports: [InputsShowcase],
      providers: [provideRouter([]), ...provideInputSources()],
    }).compileComponents();
    const fixture = TestBed.createComponent(InputsShowcase);
    await fixture.whenStable();
    return { host: fixture.nativeElement as HTMLElement, page: fixture.componentInstance };
  }

  it('shows one column per source and, once a frame ran, one row per action', async () => {
    const { host, page } = await render();
    expect(host.querySelectorAll('thead th').length).toBe(2 + 3);
    expect(page.rows()).toEqual([]);
    [...frames].forEach((cb) => cb(16));
    expect(page.rows().length).toBe(11);
    expect(page.rows()[0]?.name).toBe('throttle');
    expect(page.activeSource()).toBe('none');
  });

  it('reads the keyboard through the merged inputs', async () => {
    const { page } = await render();
    TestBed.inject(KeyboardSource).smoothingTime = 0;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', cancelable: true }));
    [...frames].forEach((cb) => cb(16));
    [...frames].forEach((cb) => cb(32));
    expect(page.rows()[0]?.merged).toBe(1);
    expect(page.activeSource()).toBe('keyboard');
    expect(page.connected()[1]).toBe(true);
  });

  it('shows no paddles on a page that cannot tell it is touch, and lets the mouse stand in when toggled', async () => {
    const { page } = await render();
    const touch = TestBed.inject(TouchSource);
    expect(page.showPaddles()).toBe(false);
    page.togglePaddles();
    expect(page.showPaddles()).toBe(true);
    expect(touch.acceptMouse).toBe(true);
    page.togglePaddles();
    expect(touch.acceptMouse).toBe(false);
  });

  it('shows the paddles at once on a coarse pointer', async () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({ matches: true }),
    });
    const { page } = await render();
    expect(page.showPaddles()).toBe(true);
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({ matches: false }),
    });
  });

  it('puts the sources’ settings in an Inputs folder of the debug panel, shown', async () => {
    await render();
    const panel = document.querySelector<HTMLElement>('.lil-gui')!;
    expect(panel.style.display).toBe('');
    expect(panel.textContent).toContain('Keyboard smoothing (s)');
    expect(panel.textContent).toContain('Paddle travel (px)');
    expect(TestBed.inject(GamepadSource).stickDeadzone).toBe(0.15);
  });
});
