import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { INPUT_SOURCES } from '@hexrace/inputs';

import { HomeScreen } from '@ui/game/home-screen';
import { type FrameCapture, captureFrames } from '@ui/testing/frames.mock';
import { ScriptedSource } from '@ui/testing/scripted-source.mock';

describe('HomeScreen', () => {
  let capture: FrameCapture;
  let source: ScriptedSource;

  beforeEach(() => {
    capture = captureFrames();
    source = new ScriptedSource();
  });

  async function render(): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [HomeScreen],
      providers: [provideRouter([]), { provide: INPUT_SOURCES, useValue: source, multi: true }],
    }).compileComponents();
    const fixture = TestBed.createComponent(HomeScreen);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the title, the two modes that are playable, and a quiet way to the lab', async () => {
    const host = await render();
    expect(host.querySelector('h1')?.textContent).toBe('HexRace');
    const rows = [...host.querySelectorAll('hr-menu-list button')];
    expect(rows.map((row: Element) => row.textContent?.trim())).toEqual([
      expect.stringContaining('Race'),
      expect.stringContaining('Rally'),
    ]);
    expect(host.querySelector('a.quiet')?.getAttribute('href')).toBe('/lab');
  });

  it('goes to the countries of the mode chosen, on a click and on the confirm button', async () => {
    const host = await render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    host.querySelectorAll('button')[1]?.click();
    expect(navigate).toHaveBeenCalledWith(['/play', 'rally']);
    navigate.mockClear();
    capture.tick(1);
    source.actions.confirm = 1;
    capture.tick(1);
    expect(navigate).toHaveBeenCalledWith(['/play', 'rally']);
  });
});
