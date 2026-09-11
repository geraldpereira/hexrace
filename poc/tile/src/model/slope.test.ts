import { describe, expect, it } from 'vitest';
import type { Profile } from './profile';
import { placeTrack } from './placement';
import { faceSlopes, steffen } from './slope';
import { heightOfS, tileSweep } from './sweep';
import type { Track } from './track';
import { pathLength } from './path';

const base: Profile = {
    position: 2,
    roadWidth: 3,
    leftShoulder: 1,
    rightShoulder: 1,
    height: 3,
    road: 1,
    shoulder: 1,
    landscape: 1,
};
const straight = (height: number): Track['tiles'][number] => ({
    exit: 12,
    profile: { ...base, height },
});

function rally(heights: number[]): Track {
    return {
        id: 't',
        name: 't',
        environment: 'europe',
        mode: 'rally',
        tiles: heights.map(straight),
    };
}

describe('pente aux faces', () => {
    it('vaut la pente moyenne quand deux tuiles montent pareil, zéro quand le sens change ou qu’une est plate', () => {
        expect(steffen(0.1, 0.1, 10, 10)).toBeCloseTo(0.1, 12);
        expect(steffen(0.1, -0.1, 10, 10)).toBe(0);
        expect(steffen(0.1, 0, 10, 10)).toBe(0);
        // Monotonie : jamais plus de deux fois la plus petite pente moyenne.
        expect(steffen(0.1, 0.3, 10, 10)).toBeLessThanOrEqual(0.2 + 1e-12);
    });

    it('fait d’une montée régulière une rampe rectiligne, sans palier aux jonctions', () => {
        const track = rally([3, 4, 5, 6, 6]);
        const placement = placeTrack(track);
        const middle = placement.tiles[2];
        expect(middle).toBeDefined();
        if (!middle) return;
        const sweep = tileSweep(middle);
        const length = pathLength(12);
        for (let i = 0; i <= 10; i++) {
            const s = i / 10;
            expect(heightOfS(sweep, s)).toBeCloseTo(4 + s, 9);
        }
        // Pente constante d'une tuile à l'autre : la même juste avant et juste après la jonction.
        const before = placement.tiles[1];
        const after = placement.tiles[2];
        if (!before || !after) return;
        const step = 1e-5;
        const slopeBefore =
            (heightOfS(tileSweep(before), 1) - heightOfS(tileSweep(before), 1 - step)) /
            (step * length);
        const slopeAfter =
            (heightOfS(tileSweep(after), step) - heightOfS(tileSweep(after), 0)) / (step * length);
        expect(slopeBefore).toBeCloseTo(slopeAfter, 4);
        expect(slopeBefore).toBeCloseTo(1 / length, 4);
    });

    it('laisse plate une tuile plate entre deux montées, sans dépassement', () => {
        const track = rally([3, 4, 4, 5, 5]);
        const placement = placeTrack(track);
        const flat = placement.tiles[2];
        if (!flat) return;
        for (let i = 0; i <= 20; i++) expect(heightOfS(tileSweep(flat), i / 20)).toBeCloseTo(4, 9);
        const climb = placement.tiles[1];
        if (!climb) return;
        for (let i = 0; i <= 20; i++) {
            const h = heightOfS(tileSweep(climb), i / 20);
            expect(h).toBeGreaterThanOrEqual(3 - 1e-9);
            expect(h).toBeLessThanOrEqual(4 + 1e-9);
        }
    });

    it('est nulle aux deux bouts d’une piste ouverte et continue en boucle', () => {
        const open = faceSlopes(rally([3, 4, 5]));
        expect(open[0]).toBe(0);
        expect(open[3]).toBe(0);
        const loop: Track = { ...rally([3, 4, 5, 4, 3]), mode: 'track' };
        const slopes = faceSlopes(loop);
        expect(slopes[0]).toBe(slopes[5]);
    });
});
