import { pathLength } from './path';
import type { Track } from './track';
import { entryProfile, isClosed } from './track';

/**
 * La pente de la piste à chaque face d'une piste posée, en unités de hauteur par unité de longueur
 * d'axe. Elle n'est pas écrite dans les données : on la déduit des deux tuiles qui se touchent à la
 * face, par la méthode de Steffen (spline cubique monotone). Ainsi :
 *
 * - une montée d'une unité par tuile sur plusieurs tuiles est une rampe rectiligne, sans palier ;
 * - une tuile plate reste plate, jamais de dépassement ;
 * - les deux tuiles d'une jonction calculent la même pente, donc pas d'arête ;
 * - aux extrémités d'une piste ouverte, et partout où la piste change de sens de pente, la pente
 *   est nulle.
 */

/** Pente moyenne d'une tuile : différence de hauteur sur la longueur de son axe. */
export function tileSecant(track: Track, index: number): number {
    const tile = track.tiles[index];
    if (!tile) return 0;
    return (tile.profile.height - entryProfile(track, index).height) / pathLength(tile.exit);
}

/**
 * Pente aux faces : l'entrée de la tuile `i` est la face `i`, sa sortie la face `i + 1`. En boucle,
 * la face 0 et la face n sont la même.
 */
export function faceSlopes(track: Track): number[] {
    const n = track.tiles.length;
    const secants = track.tiles.map((_, i) => tileSecant(track, i));
    const lengths = track.tiles.map((tile) => pathLength(tile.exit));
    const slopes = new Array<number>(n + 1).fill(0);
    for (let face = 1; face < n; face++) {
        slopes[face] = steffen(
            secants[face - 1] ?? 0,
            secants[face] ?? 0,
            lengths[face - 1] ?? 1,
            lengths[face] ?? 1,
        );
    }
    if (isClosed(track) && n > 0) {
        const wrap = steffen(
            secants[n - 1] ?? 0,
            secants[0] ?? 0,
            lengths[n - 1] ?? 1,
            lengths[0] ?? 1,
        );
        slopes[0] = wrap;
        slopes[n] = wrap;
    }
    return slopes;
}

/** Pente en un nœud entre deux segments de pentes moyennes `a` et `b` et de longueurs `la` et `lb` (Steffen, 1990). */
export function steffen(a: number, b: number, la: number, lb: number): number {
    if (a * b <= 0) return 0;
    const p = (a * lb + b * la) / (la + lb);
    return (Math.sign(a) + Math.sign(b)) * Math.min(Math.abs(a), Math.abs(b), Math.abs(p) / 2);
}

/** Interpolation de Hermite cubique sur [0, 1] : hauteurs et tangentes (dérivées par rapport à s) aux deux bouts. */
export function hermite(h0: number, t0: number, h1: number, t1: number, s: number): number {
    const s2 = s * s;
    const s3 = s2 * s;
    return (
        (2 * s3 - 3 * s2 + 1) * h0 +
        (s3 - 2 * s2 + s) * t0 +
        (-2 * s3 + 3 * s2) * h1 +
        (s3 - s2) * t1
    );
}
