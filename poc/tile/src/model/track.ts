import type { EnvironmentId } from './environment';
import { ENVIRONMENT_IDS } from './environment';
import type { Profile } from './profile';
import { profileErrors } from './profile';
import type { Tile, TileProfiles } from './tile';

/** Boucle (Track) ou point à point (Rally), spec 4.2 et 4.3. */
export type TrackMode = 'track' | 'rally';

export const TRACK_MODES: readonly TrackMode[] = ['track', 'rally'];

/**
 * Une piste (spec 5.4) : un en-tête et la liste ordonnée de ses tuiles, sans aucune position.
 * La première tuile porte le départ ; en mode Track, elle porte aussi l'arrivée (spec 2.5).
 */
export interface Track {
    readonly id: string;
    readonly name: string;
    readonly environment: EnvironmentId;
    readonly mode: TrackMode;
    /** Nombre de tours, mode Track seulement. */
    readonly laps?: number;
    readonly tiles: readonly Tile[];
}

export function isClosed(track: Track): boolean {
    return track.mode === 'track';
}

/**
 * Profil d'entrée d'une tuile : celui de sortie de la précédente. Pour la première tuile, celui
 * de la dernière en boucle ; en Rally, son propre profil de sortie, la tuile de départ est
 * uniforme.
 */
export function entryProfile(track: Track, index: number): Profile {
    const tile = tileAt(track, index);
    if (index > 0) return tileAt(track, index - 1).profile;
    if (isClosed(track)) return tileAt(track, track.tiles.length - 1).profile;
    return tile.profile;
}

export function tileProfiles(track: Track, index: number): TileProfiles {
    return { entry: entryProfile(track, index), exit: tileAt(track, index).profile };
}

function tileAt(track: Track, index: number): Tile {
    const tile = track.tiles[index];
    if (!tile)
        throw new RangeError(`pas de tuile ${index} dans une piste de ${track.tiles.length}`);
    return tile;
}

/**
 * Ce que l'on peut vérifier sans placer les tuiles : en-tête cohérent, au moins une tuile, chaque
 * profil valide. Fermeture et auto-intersection (spec 5.5) demandent le placement et viennent
 * après.
 */
export function trackErrors(track: Track): string[] {
    const errors: string[] = [];
    if (track.id.trim() === '') errors.push('identifiant vide');
    if (!ENVIRONMENT_IDS.includes(track.environment)) {
        errors.push(`environnement inconnu : ${track.environment}`);
    }
    if (!TRACK_MODES.includes(track.mode)) errors.push(`mode inconnu : ${track.mode}`);
    if (track.laps !== undefined && track.mode !== 'track') {
        errors.push('nombre de tours sans objet hors du mode Track');
    }
    if (track.tiles.length === 0) errors.push('aucune tuile');
    track.tiles.forEach((tile, index) => {
        for (const error of profileErrors(tile.profile)) {
            errors.push(`tuile ${index} : ${error}`);
        }
    });
    return errors;
}
