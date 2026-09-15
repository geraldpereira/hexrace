import { type EnvironmentId } from '@hexrace/tile';
import { type Dials, type TrackMode } from '@hexrace/track';

/** A shipped track as the catalogue names it: the address it answers to, its name, its file. */
export interface CatalogueTrack {
  readonly id: string;
  readonly name: string;
  /** Where the `.track` file is served from, relative to the application. */
  readonly file: string;
}

/**
 * What a Random entry is drawn with: the dials and the length the country wants, never the seed.
 * A seed written here would give the same track every time, which is the opposite of Random.
 */
interface CatalogueRandom {
  readonly dials: Dials;
  readonly length: number;
}

/** What a country offers in one mode: its Random entry, and the tracks shipped with the game. */
export interface CatalogueOffer {
  readonly random: CatalogueRandom;
  readonly tracks: readonly CatalogueTrack[];
}

/**
 * A country of the menus: the name the player reads, the environment its tracks are played in
 * (functional spec 2.2), and what it offers per mode. A mode missing means nothing to play there.
 */
export interface CatalogueCountry {
  readonly id: string;
  readonly name: string;
  readonly environment: EnvironmentId;
  readonly modes: Partial<Record<TrackMode, CatalogueOffer>>;
}

/** The whole catalogue file: the countries, in the order the menu shows them. */
export interface Catalogue {
  readonly countries: readonly CatalogueCountry[];
}

/** A country and what it offers in one mode, which is what a pick screen works from. */
export interface CountryOffer {
  readonly country: CatalogueCountry;
  readonly offer: CatalogueOffer;
}

/** The catalogue with nothing in it, which is what an unreadable file leaves the game with. */
export const EMPTY_CATALOGUE: Catalogue = { countries: [] };
