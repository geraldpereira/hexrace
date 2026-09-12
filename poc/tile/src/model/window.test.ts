import { describe, expect, it } from 'vitest';
import { petitAnneau } from './fixtures/petitAnneau';
import { ligne } from './fixtures/petitesBoucles';
import { placeTrack } from './placement';
import { cursorAt, playerPose, windowIndices } from './window';

describe('fenêtre de tuiles', () => {
    it('découpe une position en tuile et avancement, en bouclant sur une boucle', () => {
        expect(cursorAt(3.25, 12, true)).toEqual({ tile: 3, s: 0.25 });
        expect(cursorAt(12.5, 12, true)).toEqual({ tile: 0, s: 0.5 });
        expect(cursorAt(-0.5, 12, true)).toEqual({ tile: 11, s: 0.5 });
        expect(cursorAt(7, 4, false).tile).toBe(3);
        expect(cursorAt(-2, 4, false)).toEqual({ tile: 0, s: 0 });
    });

    it('montre X tuiles devant et Y derrière, en passant le départ sur une boucle', () => {
        expect([...windowIndices(12, 0, 3, 1, true)].sort((a, b) => a - b)).toEqual([
            0, 1, 2, 3, 11,
        ]);
        expect([...windowIndices(12, 11, 2, 1, true)].sort((a, b) => a - b)).toEqual([
            0, 1, 10, 11,
        ]);
        expect([...windowIndices(4, 3, 3, 1, false)].sort((a, b) => a - b)).toEqual([2, 3]);
        expect([...windowIndices(4, 0, 1, 2, false)]).toEqual([0, 1]);
    });

    it('place le joueur au centre de la piste, à la hauteur du sol, dans le sens de la marche', () => {
        const pose = playerPose(ligne, placeTrack(ligne), 0.5);
        expect(pose).not.toBeNull();
        if (!pose) return;
        expect(pose.travel.x).toBeCloseTo(0, 9);
        expect(pose.travel.y).toBeCloseTo(1, 9);
        expect(pose.height).toBeCloseTo(24 * (0.2 / 1.7), 9);
        // Piste de 2 unités en position 3 : centre à l'unité 4, soit x = 0 sur une tuile orientée au nord.
        expect(pose.point.x).toBeCloseTo(0, 9);
        const loop = playerPose(petitAnneau, placeTrack(petitAnneau), 12.25);
        expect(loop?.cursor).toEqual({ tile: 0, s: 0.25 });
    });
});
