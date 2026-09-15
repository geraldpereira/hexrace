import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { type CatalogueCountry } from '@ui/game/catalogue';
import { TrackCatalogue } from '@ui/game/track-catalogue';
import { CATALOGUE_URL, MOCK_CATALOGUE, serveCatalogue } from '@ui/testing/catalogue.mock';

describe('TrackCatalogue', () => {
  let warned: string[];

  beforeEach(() => {
    warned = [];
    vi.spyOn(console, 'warn').mockImplementation((message: unknown) => {
      warned.push(String(message));
    });
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  function catalogue(): TrackCatalogue {
    return TestBed.inject(TrackCatalogue);
  }

  it('reads the catalogue once and keeps it, however many screens ask', async () => {
    const service = catalogue();
    const first = service.load();
    const second = service.load();
    await serveCatalogue();
    expect((await first).countries.map((c: CatalogueCountry) => c.id)).toEqual([
      'testland',
      'loopless',
    ]);
    expect(await second).toBe(await first);
    const third = await service.load();
    expect(third.countries).toHaveLength(2);
    TestBed.inject(HttpTestingController).verify();
  });

  it('leaves the game with no country when the catalogue cannot be read, and says so', async () => {
    const reading = catalogue().load();
    const open = TestBed.inject(HttpTestingController).expectOne(CATALOGUE_URL);
    open.flush('gone', { status: 404, statusText: 'Not Found' });
    expect((await reading).countries).toEqual([]);
    expect(warned[0]).toContain(CATALOGUE_URL);
  });

  it('keeps only the countries that offer something in the mode asked for', async () => {
    const service = catalogue();
    const track = service.countries('track');
    const rally = service.countries('rally');
    await serveCatalogue();
    expect((await track).map((c: CatalogueCountry) => c.id)).toEqual(['testland']);
    expect((await rally).map((c: CatalogueCountry) => c.id)).toEqual(['testland', 'loopless']);
  });

  it('finds what a country offers in a mode, and nothing for an address that names neither', async () => {
    const service = catalogue();
    const found = service.offer('track', 'testland');
    const wrongMode = service.offer('track', 'loopless');
    const nowhere = service.offer('rally', 'atlantis');
    await serveCatalogue();
    expect((await found)?.offer.tracks).toHaveLength(2);
    expect((await found)?.country.name).toBe('Testland');
    expect(await wrongMode).toBeNull();
    expect(await nowhere).toBeNull();
  });

  it('reads a track file once, and gives the same promise back for the same file', async () => {
    const service = catalogue();
    const entry = MOCK_CATALOGUE.countries[0]!.modes.track!.tracks[0]!;
    const first = service.track(entry);
    const second = service.track(entry);
    await serveCatalogue();
    expect((await first)?.name).toBe('Mock Loop');
    expect(await second).toBe(await first);
    TestBed.inject(HttpTestingController).verify();
  });

  it('offers neither what does not read, nor what the validation refuses, and says why', async () => {
    const service = catalogue();
    const refused = service.track({
      id: 'mock-refused',
      name: 'Mock Refused',
      file: 'tracks/mock-refused.track',
    });
    const broken = service.track({
      id: 'mock-broken',
      name: 'Mock Broken',
      file: 'tracks/mock-broken.track',
    });
    const missing = service.track({ id: 'gone', name: 'Gone', file: 'tracks/gone.track' });
    await serveCatalogue();
    expect(await refused).toBeNull();
    expect(await broken).toBeNull();
    expect(await missing).toBeNull();
    expect(warned.join(' ')).toContain('mock-refused.track is not offered');
    expect(warned.join(' ')).toContain('mock-broken.track is not offered');
    expect(warned.join(' ')).toContain('tracks/gone.track could not be read');
  });
});
