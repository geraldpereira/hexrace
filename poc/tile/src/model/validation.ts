import { lineMarks, markTileError } from './marks';
import { obstacleErrors } from './obstacle';
import type { Placement } from './placement';
import { cellKey, closureError, placeTrack } from './placement';
import { profileErrors } from './profile';
import { MAX_SLOPE, slopeOf } from './slope';
import { turnKind } from './face';
import { entryProfile } from './track';
import { MAX_AMPLITUDE_STEPS, HEIGHT_STEP_METERS } from './units';
import { tileSweep } from './sweep';
import type { Track } from './track';
import { ENVIRONMENT_IDS } from './environment';
import { TRACK_MODES } from './track';

/**
 * La validation d'une piste (spec 2.6 et 5.5), en un seul passage, avec pour chaque problème la
 * tuile concernée quand il y en a une :
 *
 * - en-tête cohérent, au moins une tuile ;
 * - chaque profil respecte 2.1 (les jonctions respectent 2.6 par construction) ;
 * - aucune tuile posée sur une case déjà occupée ;
 * - en Track, la boucle se referme sur la première tuile ;
 * - chaque obstacle tient dans sa tuile ;
 * - la pente de chaque tuile reste sous le seuil de sa sortie, et l'amplitude de la piste sous 200 m ;
 * - les tuiles de départ et d'arrivée ne sont pas des épingles (spec 2.5).
 *
 * La spec 5.5 parlait aussi d'un nombre maximal de virages serrés consécutifs. Une borne ne suffit
 * pas (six virages larges recoupent aussi) et le test d'occupation de la grille tranche exactement :
 * c'est lui qui fait foi ; la borne devient un réglage de style du générateur.
 */

export interface Issue {
    /** Index de la tuile en cause, ou null pour un problème d'ensemble. */
    readonly tile: number | null;
    readonly message: string;
}

export interface Validation {
    readonly placement: Placement;
    readonly issues: Issue[];
    /** Les tuiles à surligner dans les vues. */
    readonly faulty: ReadonlySet<number>;
}

export function validateTrack(track: Track): Validation {
    const issues: Issue[] = [];
    const whole = (message: string): void => {
        issues.push({ tile: null, message });
    };

    if (track.id.trim() === '') whole('identifiant vide');
    if (!ENVIRONMENT_IDS.includes(track.environment))
        whole(`environnement inconnu : ${track.environment}`);
    if (!TRACK_MODES.includes(track.mode)) whole(`mode inconnu : ${track.mode}`);
    if (track.laps !== undefined && track.mode !== 'track')
        whole('nombre de tours sans objet hors du mode Track');
    if (track.tiles.length === 0) whole('aucune tuile');

    track.tiles.forEach((tile, index) => {
        for (const message of profileErrors(tile.profile)) issues.push({ tile: index, message });
    });

    const placement = placeTrack(track);
    const seen = new Map<string, number>();
    for (const placed of placement.tiles) {
        const key = cellKey(placed.cell);
        const previous = seen.get(key);
        if (previous === undefined) seen.set(key, placed.index);
        else
            issues.push({
                tile: placed.index,
                message: `recouvre la tuile ${previous} en (${key})`,
            });
    }

    const closure = closureError(track, placement);
    if (closure) issues.push({ tile: track.tiles.length - 1, message: closure });

    for (const placed of placement.tiles) {
        const sweep = tileSweep(placed);
        for (const obstacle of placed.tile.obstacles ?? []) {
            for (const message of obstacleErrors(sweep, obstacle))
                issues.push({ tile: placed.index, message });
        }
    }

    const kinds = {
        straight: 'ligne droite',
        wide: 'virage large',
        sharp: 'virage serré',
    } as const;
    track.tiles.forEach((tile, index) => {
        const kind = turnKind(tile.exit);
        const slope = Math.abs(
            slopeOf(tile.exit, tile.profile.height - entryProfile(track, index).height),
        );
        if (slope > MAX_SLOPE[kind] + 1e-9) {
            issues.push({
                tile: index,
                message: `pente de ${Math.round(slope * 100)} % en ${kinds[kind]}, au plus ${Math.round(MAX_SLOPE[kind] * 100)} %`,
            });
        }
    });
    const heights = track.tiles.map((t) => t.profile.height);
    if (heights.length > 0) {
        const amplitude = Math.max(...heights) - Math.min(...heights);
        if (amplitude > MAX_AMPLITUDE_STEPS) {
            whole(
                `amplitude de ${Math.round(amplitude * HEIGHT_STEP_METERS)} m, au plus ${Math.round(MAX_AMPLITUDE_STEPS * HEIGHT_STEP_METERS)} m`,
            );
        }
    }

    for (const mark of lineMarks(track)) {
        const message = markTileError(track, mark);
        if (message) issues.push({ tile: mark.tile, message });
    }

    const faulty = new Set<number>();
    for (const issue of issues) if (issue.tile !== null) faulty.add(issue.tile);
    return { placement, issues, faulty };
}

export function formatIssue(issue: Issue): string {
    return issue.tile === null ? issue.message : `tuile ${issue.tile} : ${issue.message}`;
}

export function isValid(validation: Validation): boolean {
    return validation.issues.length === 0;
}
