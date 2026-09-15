import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import {
  type Track,
  type TrackFileError,
  type TrackIssue,
  type TrackMode,
  type TrackParse,
  TrackFiles,
  TrackValidation,
} from '@hexrace/track';

import {
  type Catalogue,
  type CatalogueCountry,
  type CatalogueTrack,
  type CountryOffer,
  EMPTY_CATALOGUE,
} from '@ui/game/catalogue';

const CATALOGUE_URL = 'tracks/catalogue.json';

/**
 * The catalogue of tracks, data and not code (technical spec 3.10): the JSON is read once over
 * HTTP and kept, a `.track` file only when the track is played or its card is drawn. What the
 * catalogue names is not what the game trusts: a file that does not read or that
 * `TrackValidation` refuses is said in the console and left out, never thrown at the player.
 */
@Injectable({ providedIn: 'root' })
export class TrackCatalogue {
  private readonly files = inject(TrackFiles);
  private readonly http = inject(HttpClient);
  private readonly validation = inject(TrackValidation);
  private catalogue: Promise<Catalogue> | null = null;
  private readonly tracks = new Map<string, Promise<Track | null>>();

  /** The catalogue, read once; an unreachable file leaves the game with no country at all. */
  load(): Promise<Catalogue> {
    this.catalogue ??= firstValueFrom(this.http.get<Catalogue>(CATALOGUE_URL)).catch(
      (error: unknown) => {
        this.complain(CATALOGUE_URL, error);
        return EMPTY_CATALOGUE;
      },
    );
    return this.catalogue;
  }

  /** The countries with something to offer in that mode, in the order the catalogue lists them. */
  async countries(mode: TrackMode): Promise<CatalogueCountry[]> {
    const catalogue = await this.load();
    return catalogue.countries.filter(
      (country: CatalogueCountry) => country.modes[mode] !== undefined,
    );
  }

  /** What one country offers in one mode, or nothing when the address names neither. */
  async offer(mode: TrackMode, id: string): Promise<CountryOffer | null> {
    const catalogue = await this.load();
    const country = catalogue.countries.find((one: CatalogueCountry) => one.id === id);
    const offer = country?.modes[mode];
    return country && offer ? { country, offer } : null;
  }

  /** The track behind a catalogue entry, read once and kept, or nothing when it is refused. */
  track(entry: CatalogueTrack): Promise<Track | null> {
    let reading = this.tracks.get(entry.file);
    if (!reading) {
      reading = this.read(entry);
      this.tracks.set(entry.file, reading);
    }
    return reading;
  }

  private async read(entry: CatalogueTrack): Promise<Track | null> {
    const text = await firstValueFrom(this.http.get(entry.file, { responseType: 'text' })).catch(
      (error: unknown) => {
        this.complain(entry.file, error);
        return null;
      },
    );
    return text === null ? null : this.accepted(entry, this.files.parse(text));
  }

  private accepted(entry: CatalogueTrack, parse: TrackParse): Track | null {
    if (!('track' in parse)) {
      this.refuse(
        entry,
        parse.errors.map((error: TrackFileError) => error.message),
      );
      return null;
    }
    const review = this.validation.validate(parse.track);
    if (review.issues.length === 0) return parse.track;
    this.refuse(
      entry,
      review.issues.map((issue: TrackIssue) => this.validation.format(issue)),
    );
    return null;
  }

  private refuse(entry: CatalogueTrack, reasons: readonly string[]): void {
    console.warn(`hexrace: ${entry.file} is not offered: ${reasons.join('; ')}`);
  }

  private complain(url: string, error: unknown): void {
    console.warn(`hexrace: ${url} could not be read`, error);
  }
}
