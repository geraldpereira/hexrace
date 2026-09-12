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
    frames[0]?.(16);
    expect(page.rows().length).toBe(9);
    expect(page.rows()[0]?.name).toBe('throttle');
    expect(page.activeSource()).toBe('none');
  });

  it('reads the keyboard through the merged inputs', async () => {
    const { page } = await render();
    TestBed.inject(KeyboardSource).smoothingTime = 0;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', cancelable: true }));
    frames[0]?.(16);
    frames[1]?.(32);
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
    Reflect.deleteProperty(window, 'matchMedia');
  });

  it('tunes the sources from the settings', async () => {
    const { page } = await render();
    page.setKeyboardSmoothing('0.25');
    page.setStickDeadzone('0.3');
    page.setTravel('120');
    expect(TestBed.inject(KeyboardSource).smoothingTime).toBe(0.25);
    expect(TestBed.inject(GamepadSource).stickDeadzone).toBe(0.3);
    expect(TestBed.inject(TouchSource).travelPx).toBe(120);
  });
});
