import type { ExitFace } from './face';
import type { Obstacle } from './obstacle';
import type { Profile } from './profile';

/**
 * Une tuile telle qu'elle s'écrit dans un fichier de piste (spec 5.4, croquis 6) : sa face de
 * sortie et son profil de sortie. Son profil d'entrée n'est pas stocké : c'est le profil de
 * sortie de la tuile précédente, ce qui garantit la règle d'assemblage 2.6 par construction.
 */
export interface Tile {
    readonly exit: ExitFace;
    /** Profil sur la face de sortie. Tout ce qui diffère de l'entrée change au milieu de la tuile. */
    readonly profile: Profile;
    /** Obstacles posés par rapport à la piste (spec 2.4). */
    readonly obstacles?: readonly Obstacle[];
}

/** Une tuile avec ses deux profils résolus : ce dont la géométrie a besoin. */
export interface TileProfiles {
    readonly entry: Profile;
    readonly exit: Profile;
}
