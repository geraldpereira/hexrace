import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { BestTimes } from '@hexrace/game-commons';
import { type Track, TrackGenerator } from '@hexrace/track';

import { type CatalogueCountry, type CountryOffer } from '@ui/game/catalogue';
import { GameTracks, type PlayableTrack } from '@ui/game/game-tracks';
import { serveCatalogue } from '@ui/testing/catalogue.mock';

describe('GameTracks', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  function games(): GameTracks {
    return TestBed.inject(GameTracks);
  }

  async function settle<T>(asked: Promise<T>): Promise<T> {
    await serveCatalogue();
    return asked;
  }

  function offerOf(mode: 'track' | 'rally', id = 'testland'): Promise<CountryOffer> {
    return settle(games().offer(mode, id)).then((found: CountryOffer | null) => found!);
  }

  it('reads the mode of an address, and refuses what is not one', () => {
    expect(games().modeOf('track')).toBe('track');
    expect(games().modeOf('rally')).toBe('rally');
    expect(games().modeOf('collapse')).toBeNull();
    expect(games().modeOf(null)).toBeNull();
  });

  it('lists the countries of a mode', async () => {
    const countries = await settle(games().countries('track'));
    expect(countries.map((one: CatalogueCountry) => one.name)).toEqual(['Testland']);
  });

  it('keeps the shipped tracks the model accepts, and leaves the rest out', async () => {
    TestBed.inject(BestTimes).record('mock-loop-01', 61_234);
    const found = await offerOf('track');
    const offered: PlayableTrack[] = await settle(games().offered(found));
    expect(offered).toHaveLength(1);
    expect(offered[0]?.track.id).toBe('mock-loop-01');
    expect(offered[0]?.summary.name).toBe('Mock Loop');
    expect(offered[0]?.summary.environment).toBe('Testland');
    expect(offered[0]?.summary.bestMs).toBe(61_234);
    expect(offered[0]?.summary.lengthM).toBeGreaterThan(0);
    expect(offered[0]?.summary.locked).toBe(false);
    expect(offered[0]?.summary.thumbnail).toBeNull();
  });

  it('draws the card of the Random entry from the dials alone, with no track generated', async () => {
    const found = await offerOf('rally', 'loopless');
    const generate = vi.spyOn(TestBed.inject(TrackGenerator), 'generate');
    const card = games().randomCard(found);
    expect(card.name).toBe('Random');
    expect(card.environment).toBe('Loopless');
    expect(card.bestMs).toBeNull();
    expect(card.lengthM).toBeGreaterThan(0);
    expect(generate).not.toHaveBeenCalled();
  });

  it('finds the shipped track an address names, and nothing for what it does not', async () => {
    const playable = games().shipped('track', 'testland', 'mock-loop');
    const unknownTrack = games().shipped('track', 'testland', 'nowhere');
    const unknownCountry = games().shipped('track', 'atlantis', 'mock-loop');
    const refused = games().shipped('track', 'testland', 'mock-refused');
    await serveCatalogue();
    expect((await playable)?.track.name).toBe('Mock Loop');
    expect(await unknownTrack).toBeNull();
    expect(await unknownCountry).toBeNull();
    expect(await refused).toBeNull();
  });

  it('draws the same track for a seed every time, a line in Rally and a loop in Track', async () => {
    const drawn = (await settle(games().random('rally', 'testland', 'abc123')))!;
    expect(drawn.track.mode).toBe('rally');
    expect(drawn.summary.environment).toBe('Testland');
    expect(drawn.summary.bestMs).toBeNull();
    const again = await games().random('rally', 'testland', 'abc123');
    expect(again?.track.id).toBe(drawn.track.id);
    const loop = await games().random('track', 'testland', 'abc123');
    expect(loop?.track.mode).toBe('track');
    expect(loop?.summary.name).toContain('Seed');
  });

  it('gives up rather than race a line under a Track menu, and knows no unknown country', async () => {
    const line: Track = {
      id: 'gen-line',
      name: 'Seed x',
      environment: 'north',
      mode: 'rally',
      tiles: [],
    };
    vi.spyOn(TestBed.inject(TrackGenerator), 'generate').mockReturnValue(line);
    const given = games().random('track', 'testland', 'abc123');
    const nowhere = games().random('track', 'atlantis', 'abc123');
    await serveCatalogue();
    expect(await given).toBeNull();
    expect(await nowhere).toBeNull();
  });

  it('draws a fresh seed of its own each time, in what a generator string accepts', () => {
    const seeds = new Set<string>();
    for (let i = 0; i < 20; i++) seeds.add(games().seed());
    for (const seed of seeds) expect(seed).toMatch(/^[a-z0-9]{6}$/);
    expect(seeds.size).toBeGreaterThan(1);
  });
});
