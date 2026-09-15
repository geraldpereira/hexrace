import { TestBed } from '@angular/core/testing';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { type Tile } from '@hexrace/tile';
import {
  type Track,
  type TrackIssue,
  type TrackMode,
  TrackFiles,
  TrackGenerator,
  TrackValidation,
} from '@hexrace/track';

import {
  type Catalogue,
  type CatalogueCountry,
  type CatalogueOffer,
  type CatalogueTrack,
} from '@ui/game/catalogue';

const HERE = process.cwd();
const ROOT = existsSync(join(HERE, 'apps/web/public')) ? HERE : join(HERE, '../..');
const PUBLIC = join(ROOT, 'apps/web/public');
const MIN_ROAD_UNITS = 2;
const NORTH_ROAD_UNITS = 3;

describe('the shipped catalogue', () => {
  let files: TrackFiles;
  let validation: TrackValidation;
  let catalogue: Catalogue;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    files = TestBed.inject(TrackFiles);
    validation = TestBed.inject(TrackValidation);
    catalogue = JSON.parse(
      readFileSync(join(PUBLIC, 'tracks/catalogue.json'), 'utf8'),
    ) as Catalogue;
  });

  function entries(): { country: CatalogueCountry; mode: string; entry: CatalogueTrack }[] {
    return catalogue.countries.flatMap((country: CatalogueCountry) =>
      Object.entries(country.modes).flatMap(([mode, offer]: [string, CatalogueOffer]) =>
        offer.tracks.map((entry: CatalogueTrack) => ({ country, mode, entry })),
      ),
    );
  }

  function trackOf(entry: CatalogueTrack): Track {
    const read = files.parse(readFileSync(join(PUBLIC, entry.file), 'utf8'));
    if (!('track' in read)) throw new Error(`${entry.file}: ${JSON.stringify(read.errors)}`);
    return read.track;
  }

  it('names the three countries of the functional spec 2.2, each with its environment', () => {
    expect(catalogue.countries.map((one: CatalogueCountry) => one.name)).toEqual([
      'Finland',
      'France',
      'Morocco',
    ]);
    expect(catalogue.countries.map((one: CatalogueCountry) => one.environment)).toEqual([
      'north',
      'europe',
      'africa',
    ]);
  });

  it('offers a Random entry and at least one shipped track per country and per mode', () => {
    for (const country of catalogue.countries) {
      for (const mode of ['track', 'rally'] as const) {
        const offer = country.modes[mode];
        expect(offer, `${country.id} in ${mode}`).toBeDefined();
        expect(offer!.tracks.length, `${country.id} in ${mode}`).toBeGreaterThan(0);
        expect(offer!.random.length, `${country.id} in ${mode}`).toBeGreaterThan(0);
      }
    }
  });

  it('reads every track file it names, and the model accepts every one of them', () => {
    const named = entries();
    expect(named.length).toBeGreaterThan(5);
    for (const { country, mode, entry } of named) {
      const track = trackOf(entry);
      const issues = validation
        .validate(track)
        .issues.map((issue: TrackIssue) => validation.format(issue));
      expect(issues, entry.file).toEqual([]);
      expect(track.id, entry.file).toBe(entry.id);
      expect(track.mode, entry.file).toBe(mode);
      expect(track.environment, entry.file).toBe(country.environment);
    }
  });

  it('lays no road under two units, nor under three in the North', () => {
    for (const { country, entry } of entries()) {
      const least = country.environment === 'north' ? NORTH_ROAD_UNITS : MIN_ROAD_UNITS;
      for (const tile of trackOf(entry).tiles) {
        expect(tile.profile.roadWidth, `${entry.file}`).toBeGreaterThanOrEqual(least);
      }
    }
  });

  it('paves no face of the North with the rank that only comes as a patch', () => {
    for (const { country, entry } of entries()) {
      if (country.environment !== 'north') continue;
      const paved = trackOf(entry).tiles.map((tile: Tile) => tile.profile.road);
      expect(Math.max(...paved), entry.file).toBeLessThanOrEqual(2);
    }
  });

  it('draws a track of the right mode from every Random entry, as GameTracks retries it', () => {
    const generator = TestBed.inject(TrackGenerator);
    for (const country of catalogue.countries) {
      for (const [mode, offer] of Object.entries(country.modes) as [TrackMode, CatalogueOffer][]) {
        for (const seed of ['aaa111', 'bbb222', 'ccc333']) {
          const drawn = [0, 1, 2, 3, 4, 5, 6, 7]
            .map((attempt: number) =>
              generator.generate({
                environment: country.environment,
                seed: attempt === 0 ? seed : `${seed}-${String(attempt + 1)}`,
                dials: offer.random.dials,
                length: offer.random.length,
                mode,
              }),
            )
            .find((track: Track) => track.mode === mode);
          expect(drawn, `${country.id} ${mode} ${seed}`).toBeDefined();
          expect(validation.validate(drawn!).issues, `${country.id} ${mode} ${seed}`).toEqual([]);
        }
      }
    }
  });
});
