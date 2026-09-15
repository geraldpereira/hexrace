import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';

import { BEST_TIMES_KEY } from '@hexrace/game-commons';
import { INPUT_SOURCES } from '@hexrace/inputs';

import { GameTracks } from '@ui/game/game-tracks';
import { TrackPick } from '@ui/game/track-pick';
import { serveCatalogue } from '@ui/testing/catalogue.mock';
import { type FrameCapture, captureFrames } from '@ui/testing/frames.mock';
import { ScriptedSource } from '@ui/testing/scripted-source.mock';

describe('TrackPick', () => {
  let capture: FrameCapture;
  let source: ScriptedSource;

  beforeEach(() => {
    localStorage.clear();
    capture = captureFrames();
    source = new ScriptedSource();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  async function render(
    mode: string | null = 'track',
    country: string | null = 'testland',
  ): Promise<{ host: HTMLElement; page: TrackPick }> {
    const params = new Map<string, string>();
    if (mode !== null) params.set('mode', mode);
    if (country !== null) params.set('country', country);
    await TestBed.configureTestingModule({
      imports: [TrackPick],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: INPUT_SOURCES, useValue: source, multi: true },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: params } } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(TrackPick);
    await fixture.whenStable();
    await serveCatalogue();
    await fixture.whenStable();
    return { host: fixture.nativeElement as HTMLElement, page: fixture.componentInstance };
  }

  it('shows Random first, then the shipped tracks, with the best time saved for them', async () => {
    localStorage.setItem(BEST_TIMES_KEY, JSON.stringify({ tracks: { 'mock-loop-01': 61_234 } }));
    const { host } = await render();
    const cards = [...host.querySelectorAll('hr-track-card h3')];
    expect(cards.map((one: Element) => one.textContent)).toEqual(['Random', 'Mock Loop']);
    expect(host.querySelector('h1')?.textContent).toBe('Testland');
    expect(host.textContent).toContain('1:01.234');
  });

  it('draws a seed and puts it in the address when Random is taken', async () => {
    const { host } = await render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    vi.spyOn(TestBed.inject(GameTracks), 'seed').mockReturnValue('abc123');
    host
      .querySelector('hr-track-card')
      ?.dispatchEvent(new PointerEvent('click', { bubbles: true }));
    expect(navigate).toHaveBeenCalledWith(['/race', 'track', 'testland', 'random', 'abc123']);
  });

  it('rings the card the pad walks to and drives the shipped track on confirm', async () => {
    const { host } = await render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    capture.tick(1);
    expect(host.querySelector('hr-track-card')?.classList.contains('hr-menu-picked')).toBe(true);
    source.actions.navigateX = 1;
    capture.tick(1);
    source.actions.navigateX = 0;
    source.actions.confirm = 1;
    capture.tick(1);
    expect(navigate).toHaveBeenCalledWith(['/race', 'track', 'testland', 'mock-loop-01']);
  });

  it('answers nothing when the grid points past the last card', async () => {
    const { page } = await render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    page.race(9);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('goes back to the country screen, on the button and on back', async () => {
    const { host } = await render('rally');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    host.querySelector<HTMLButtonElement>('button.quiet')?.click();
    expect(navigate).toHaveBeenCalledWith(['/play', 'rally']);
    navigate.mockClear();
    capture.tick(1);
    source.actions.back = 1;
    capture.tick(1);
    expect(navigate).toHaveBeenCalledWith(['/play', 'rally']);
  });

  it('goes home and builds no card when the address names no mode or no country', async () => {
    const navigate = vi.spyOn(Router.prototype, 'navigate').mockResolvedValue(true);
    const nameless = await render(null);
    expect(nameless.host.querySelectorAll('hr-track-card').length).toBe(0);
    expect(navigate).toHaveBeenCalledWith(['/']);
    navigate.mockClear();
    TestBed.resetTestingModule();
    const nowhere = await render('track', 'atlantis');
    expect(nowhere.host.querySelectorAll('hr-track-card').length).toBe(0);
    expect(navigate).toHaveBeenCalledWith(['/']);
    navigate.mockClear();
    TestBed.resetTestingModule();
    const bare = await render('track', null);
    expect(bare.host.querySelectorAll('hr-track-card').length).toBe(0);
    expect(navigate).toHaveBeenCalledWith(['/']);
  });
});
