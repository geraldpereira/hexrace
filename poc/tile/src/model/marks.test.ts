import { describe, expect, it } from 'vitest';
import { petitAnneau } from './fixtures/petitAnneau';
import { ligne } from './fixtures/petitesBoucles';
import { polygonArea } from './geometry';
import { checkerSquares, lineMarks } from './marks';
import { placeTrack } from './placement';
import { tileSweep } from './sweep';

describe('départ et arrivée', () => {
    it('met départ et arrivée sur la première tuile en Track, aux deux bouts en Rally', () => {
        expect(lineMarks(petitAnneau)).toEqual([{ tile: 0, kind: 'both', at: 0.5 }]);
        expect(lineMarks(ligne)).toEqual([
            { tile: 0, kind: 'start', at: 0.5 },
            { tile: 3, kind: 'finish', at: 0.5 },
        ]);
    });

    it('dessine un damier qui couvre la largeur de la piste sur une unité de long', () => {
        const placed = placeTrack(petitAnneau).tiles[0];
        expect(placed).toBeDefined();
        if (!placed) return;
        const squares = checkerSquares(tileSweep(placed), 0.5);
        // Piste de 3 unités : 6 colonnes de demi-unité sur 2 rangées.
        expect(squares).toHaveLength(12);
        const area = squares.reduce((sum, sq) => sum + Math.abs(polygonArea(sq.points)), 0);
        expect(area).toBeCloseTo(3 * 1, 6);
        expect(squares.filter((sq) => sq.dark)).toHaveLength(6);
        expect(squares[0]?.dark).not.toBe(squares[1]?.dark);
    });
});
