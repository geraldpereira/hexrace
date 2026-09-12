import type { SPoint } from './geometry';
import { add, scale } from './layout';
import { pathLength } from './path';
import type { TileSweep } from './sweep';
import { boundariesAt } from './sweep';
import type { Track } from './track';
import { isClosed } from './track';
import { turnKind } from './face';

/**
 * Les tuiles spéciales (spec 2.5) : la première tuile porte le **départ** ; en Track elle porte
 * aussi l'**arrivée**, en Rally c'est la dernière tuile. Ces tuiles peuvent tourner et monter, mais
 * **pas en épingle**. La ligne se trouve au milieu de la tuile, en travers de la piste, et se dessine
 * en damier.
 */

export type MarkKind = 'start' | 'finish' | 'both';

export interface LineMark {
    readonly tile: number;
    readonly kind: MarkKind;
    /** Avancement de la ligne sur l'axe de la tuile. */
    readonly at: number;
}

export const LINE_AT = 0.5;
/** Longueur de la ligne le long de la piste, en unités, et nombre de rangées de cases. */
export const LINE_LENGTH = 1;
export const LINE_ROWS = 2;

export function lineMarks(track: Track): LineMark[] {
    const n = track.tiles.length;
    if (n === 0) return [];
    if (isClosed(track)) return [{ tile: 0, kind: 'both', at: LINE_AT }];
    if (n === 1) return [{ tile: 0, kind: 'both', at: LINE_AT }];
    return [
        { tile: 0, kind: 'start', at: LINE_AT },
        { tile: n - 1, kind: 'finish', at: LINE_AT },
    ];
}

export interface CheckerSquare {
    readonly points: SPoint[];
    readonly dark: boolean;
}

/**
 * Le damier d'une ligne : des cases d'une demi-unité en travers de la piste, sur `LINE_ROWS` rangées,
 * qui suivent la courbe de la piste. Chaque point connaît son avancement, donc sa hauteur.
 */
export function checkerSquares(sweep: TileSweep, at: number): CheckerSquare[] {
    const span = LINE_LENGTH / pathLength(sweep.exit);
    const squares: CheckerSquare[] = [];
    for (let row = 0; row < LINE_ROWS; row++) {
        const s0 = at - span / 2 + (span * row) / LINE_ROWS;
        const s1 = s0 + span / LINE_ROWS;
        const b0 = boundariesAt(sweep, s0);
        const b1 = boundariesAt(sweep, s1);
        const width0 = distance(b0.roadLeft, b0.roadRight);
        const columns = Math.max(2, Math.round(width0 * 2));
        for (let column = 0; column < columns; column++) {
            const u0 = column / columns;
            const u1 = (column + 1) / columns;
            const across = (b: typeof b0, u: number, s: number): SPoint => ({
                ...add(
                    b.roadLeft,
                    scale({ x: b.roadRight.x - b.roadLeft.x, y: b.roadRight.y - b.roadLeft.y }, u),
                ),
                s,
            });
            squares.push({
                points: [
                    across(b0, u0, s0),
                    across(b1, u0, s1),
                    across(b1, u1, s1),
                    across(b0, u1, s0),
                ],
                dark: (row + column) % 2 === 0,
            });
        }
    }
    return squares;
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Ce qui manque à une tuile de départ ou d'arrivée, ou null : elle ne doit pas être une épingle (spec 2.5). */
export function markTileError(track: Track, mark: LineMark): string | null {
    const tile = track.tiles[mark.tile];
    if (!tile || turnKind(tile.exit) !== 'sharp') return null;
    const name =
        mark.kind === 'start'
            ? 'de départ'
            : mark.kind === 'finish'
              ? "d'arrivée"
              : "de départ et d'arrivée";
    return `la tuile ${name} ne peut pas être une épingle`;
}
