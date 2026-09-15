import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';

import { INPUT_SOURCES } from '@hexrace/inputs';

import { CountryPick } from '@ui/game/country-pick';
import { serveCatalogue } from '@ui/testing/catalogue.mock';
import { type FrameCapture, captureFrames } from '@ui/testing/frames.mock';
import { ScriptedSource } from '@ui/testing/scripted-source.mock';

describe('CountryPick', () => {
  let capture: FrameCapture;
  let source: ScriptedSource;

  beforeEach(() => {
    capture = captureFrames();
    source = new ScriptedSource();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  async function render(mode: string | null = 'rally'): Promise<HTMLElement> {
    await TestBed.configureTestingModule({
      imports: [CountryPick],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: INPUT_SOURCES, useValue: source, multi: true },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: new Map<string, string>(mode === null ? [] : [['mode', mode]]) },
          },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(CountryPick);
    await fixture.whenStable();
    await serveCatalogue();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('titles the screen with the mode and lists the countries that offer it', async () => {
    const host = await render('rally');
    expect(host.querySelector('h1')?.textContent).toBe('Rally');
    expect([...host.querySelectorAll('hr-menu-list button')].map((b) => b.textContent)).toEqual([
      expect.stringContaining('Testland'),
      expect.stringContaining('Loopless'),
    ]);
  });

  it('shows only what a Track menu has to offer, and titles it Race', async () => {
    const host = await render('track');
    expect(host.querySelector('h1')?.textContent).toBe('Race');
    expect(host.querySelectorAll('hr-menu-list button').length).toBe(1);
  });

  it('goes on to the tracks of the country picked, by a click and by the pad', async () => {
    const host = await render('rally');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    host.querySelectorAll('button')[0]?.click();
    expect(navigate).toHaveBeenCalledWith(['/play', 'rally', 'testland']);
    navigate.mockClear();
    capture.tick(1);
    source.actions.navigateY = 1;
    capture.tick(1);
    source.actions.navigateY = 0;
    source.actions.confirm = 1;
    capture.tick(1);
    expect(navigate).toHaveBeenCalledWith(['/play', 'rally', 'loopless']);
  });

  it('goes home on back, on the back button, and when the address names no mode', async () => {
    const host = await render('rally');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    host.querySelector<HTMLButtonElement>('button.quiet')?.click();
    expect(navigate).toHaveBeenCalledWith(['/']);
    navigate.mockClear();
    capture.tick(1);
    source.actions.back = 1;
    capture.tick(1);
    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('builds nothing when the address names no mode at all', async () => {
    const navigate = vi.spyOn(Router.prototype, 'navigate').mockResolvedValue(true);
    const host = await render(null);
    expect(navigate).toHaveBeenCalledWith(['/']);
    expect(host.querySelectorAll('hr-menu-list button').length).toBe(0);
  });
});
