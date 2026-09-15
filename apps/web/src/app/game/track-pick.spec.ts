import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { BEST_TIMES_KEY } from '@hexrace/game-commons';
import { INPUT_SOURCES } from '@hexrace/inputs';

import { GameTracks } from '@ui/game/game-tracks';
import { TrackPick } from '@ui/game/track-pick';
import { type FrameCapture, captureFrames } from '@ui/testing/frames.mock';
import { ScriptedSource } from '@ui/testing/scripted-source.mock';

describe('TrackPick', () => {
  let capture: FrameCapture;
  let source: ScriptedSource;

  beforeEach(() => {
    localStorage.clear();
    capture = captureFrames();
    source = new ScriptedSource();
  });

  async function render(): Promise<{ host: HTMLElement; page: TrackPick }> {
    await TestBed.configureTestingModule({
      imports: [TrackPick],
      providers: [provideRouter([]), { provide: INPUT_SOURCES, useValue: source, multi: true }],
    }).compileComponents();
    const fixture = TestBed.createComponent(TrackPick);
    await fixture.whenStable();
    return { host: fixture.nativeElement as HTMLElement, page: fixture.componentInstance };
  }

  it('lays out one card per playable track, with the best time saved for it', async () => {
    localStorage.setItem(BEST_TIMES_KEY, JSON.stringify({ tracks: { 'europe-ring-01': 61_234 } }));
    const { host, page } = await render();
    const cards = host.querySelectorAll('hr-track-card');
    expect(cards.length).toBe(page.tracks.length);
    expect(cards.length).toBeGreaterThan(0);
    expect(host.textContent).toContain('Small Ring');
    expect(host.textContent).toContain('1:01.234');
  });

  it('rings the card the pad walks to and drives it on confirm', async () => {
    const { host, page } = await render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    capture.tick(1);
    expect(host.querySelector('hr-track-card')?.classList.contains('hr-menu-picked')).toBe(true);
    source.actions.confirm = 1;
    capture.tick(1);
    expect(navigate).toHaveBeenCalledWith(['/race', page.tracks[0]!.track.id]);
  });

  it('drives the card a finger taps, and goes home on back and on the back button', async () => {
    const { host, page } = await render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    host.querySelector('hr-track-card')?.dispatchEvent(new PointerEvent('click', { bubbles: true }));
    expect(navigate).toHaveBeenCalledWith(['/race', page.tracks[0]!.track.id]);
    navigate.mockClear();
    host.querySelector<HTMLButtonElement>('button.quiet')?.click();
    expect(navigate).toHaveBeenCalledWith(['/']);
    navigate.mockClear();
    capture.tick(1);
    source.actions.back = 1;
    capture.tick(1);
    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('answers nothing when the grid points at no track', async () => {
    const { page } = await render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    page.race(page.tracks.length);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows no card at all when no example is playable', async () => {
    vi.spyOn(GameTracks.prototype, 'all').mockReturnValue([]);
    const { host } = await render();
    expect(host.querySelectorAll('hr-track-card').length).toBe(0);
  });
});
