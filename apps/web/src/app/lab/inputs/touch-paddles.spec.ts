import { TestBed } from '@angular/core/testing';

import { TouchSource } from '@hexrace/inputs';

import { TouchPaddles } from '@ui/lab/inputs/touch-paddles';

describe('TouchPaddles', () => {
  let frames: FrameRequestCallback[];

  beforeEach(() => {
    frames = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      frames.push(cb);
      return frames.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
  });

  async function render(): Promise<{
    host: HTMLElement;
    paddles: TouchPaddles;
    source: TouchSource;
  }> {
    await TestBed.configureTestingModule({ imports: [TouchPaddles] }).compileComponents();
    const source = TestBed.inject(TouchSource);
    const fixture = TestBed.createComponent(TouchPaddles);
    fixture.componentRef.setInput('source', source);
    await fixture.whenStable();
    return {
      host: fixture.nativeElement as HTMLElement,
      paddles: fixture.componentInstance,
      source,
    };
  }

  it('draws the three zones and no paddle at rest', async () => {
    const { host } = await render();
    expect(host.querySelectorAll('.zone').length).toBe(3);
    expect(host.querySelector('.knob')).toBeNull();
  });

  it('places the knob along the paddle axis, from the finger origin', async () => {
    const { paddles, source } = await render();
    source.travelPx = 100;
    const drive = {
      zone: 'drive' as const,
      active: true,
      originX: 100,
      originY: 300,
      deflection: -0.5,
    };
    const steer = {
      zone: 'steer' as const,
      active: true,
      originX: 800,
      originY: 300,
      deflection: 0.5,
    };
    expect(paddles.knobX(drive)).toBe(100);
    expect(paddles.knobY(drive)).toBe(250);
    expect(paddles.knobX(steer)).toBe(850);
    expect(paddles.knobY(steer)).toBe(300);
  });

  it('copies the source paddles every frame', async () => {
    const { paddles, source } = await render();
    source.byZone.drive.active = true;
    source.byZone.drive.deflection = 0.3;
    frames[0]?.(0);
    expect(paddles.paddles()[0]).toEqual(source.byZone.drive);
    expect(paddles.paddles()[0]).not.toBe(source.byZone.drive);
    source.byZone.drive.active = false;
  });
});
