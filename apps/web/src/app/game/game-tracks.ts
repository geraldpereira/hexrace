import { Injectable, inject } from '@angular/core';

import { Random } from '@hexrace/commons';
import { BestTimes } from '@hexrace/game-commons';
import { type TrackSummary } from '@hexrace/hud';
import { SIDE, UNIT_METERS } from '@hexrace/tile';
import { type Track, type TrackMode, TRACK_MODES, TrackGenerator } from '@hexrace/track';

import { type CatalogueCountry, type CatalogueTrack, type CountryOffer } from '@ui/game/catalogue';
import { TrackCatalogue } from '@ui/game/track-catalogue';

const ACROSS_FLATS = Math.sqrt(3);
const SEED_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const SEED_LENGTH = 6;
const LOOP_ATTEMPTS = 8;

/** A track the game offers: the track itself, and the card the pick screen draws for it. */
export interface PlayableTrack {
  readonly track: Track;
  readonly summary: TrackSummary;
}

/**
 * What the game has to play on, read from the catalogue under `apps/web/public/tracks` and never
 * from a compiled list: the countries of a mode, the tracks a country ships, and the Random
 * entry, whose seed is drawn here and then lives in the address so a run can be reloaded. A
 * Track seed the generator could not close is drawn again rather than raced as a Rally.
 */
@Injectable({ providedIn: 'root' })
export class GameTracks {
  private readonly bestTimes = inject(BestTimes);
  private readonly catalogue = inject(TrackCatalogue);
  private readonly generator = inject(TrackGenerator);
  private readonly randomness = inject(Random);

  /** The mode an address names, or nothing when it names no mode the game knows. */
  modeOf(value: string | null): TrackMode | null {
    return TRACK_MODES.find((mode: TrackMode) => mode === value) ?? null;
  }

  countries(mode: TrackMode): Promise<CatalogueCountry[]> {
    return this.catalogue.countries(mode);
  }

  offer(mode: TrackMode, countryId: string): Promise<CountryOffer | null> {
    return this.catalogue.offer(mode, countryId);
  }

  /** The shipped tracks of a country, cards read afresh, with what the model refuses left out. */
  async offered(found: CountryOffer): Promise<PlayableTrack[]> {
    const read = await Promise.all(
      found.offer.tracks.map((entry: CatalogueTrack) => this.playable(found.country, entry)),
    );
    return read.filter((one: PlayableTrack | null): one is PlayableTrack => one !== null);
  }

  /** The shipped track at that address, or nothing when the catalogue names none. */
  async shipped(
    mode: TrackMode,
    countryId: string,
    trackId: string,
  ): Promise<PlayableTrack | null> {
    const found = await this.offer(mode, countryId);
    if (!found) return null;
    const entry = found.offer.tracks.find((one: CatalogueTrack) => one.id === trackId);
    return entry ? this.playable(found.country, entry) : null;
  }

  /** The track a seed draws for a country and a mode, the same one every time it is reloaded. */
  async random(mode: TrackMode, countryId: string, seed: string): Promise<PlayableTrack | null> {
    const found = await this.offer(mode, countryId);
    if (!found) return null;
    const track = this.drawn(found, mode, seed);
    if (!track) return null;
    const best = this.bestTimes.best(track.id);
    return { track, summary: this.card(track.name, found.country.name, track.tiles.length, best) };
  }

  /** The card of the Random entry, drawn from the dials alone: no track is generated for it. */
  randomCard(found: CountryOffer): TrackSummary {
    return this.card('Random', found.country.name, found.offer.random.length, null);
  }

  /** A fresh seed, the one thing about a Random race the catalogue does not write down. */
  seed(): string {
    const rng = this.randomness.fresh();
    let seed = '';
    for (let i = 0; i < SEED_LENGTH; i++) seed += SEED_ALPHABET[rng.int(SEED_ALPHABET.length)];
    return seed;
  }

  private drawn(found: CountryOffer, mode: TrackMode, seed: string): Track | null {
    for (let attempt = 0; attempt < LOOP_ATTEMPTS; attempt++) {
      const track = this.generator.generate({
        environment: found.country.environment,
        seed: attempt === 0 ? seed : `${seed}-${String(attempt + 1)}`,
        dials: found.offer.random.dials,
        length: found.offer.random.length,
        mode,
      });
      if (track.mode === mode) return track;
    }
    return null;
  }

  private async playable(
    country: CatalogueCountry,
    entry: CatalogueTrack,
  ): Promise<PlayableTrack | null> {
    const track = await this.catalogue.track(entry);
    if (!track) return null;
    const best = this.bestTimes.best(track.id);
    return { track, summary: this.card(entry.name, country.name, track.tiles.length, best) };
  }

  private card(
    name: string,
    environment: string,
    tiles: number,
    bestMs: number | null,
  ): TrackSummary {
    return {
      name,
      environment,
      lengthM: tiles * SIDE * ACROSS_FLATS * UNIT_METERS,
      bestMs,
      locked: false,
      thumbnail: null,
    };
  }
}
