import { describe, expect, it } from 'vitest';
import { APOTHEM, SIDE } from './layout';
import { HAZARD_FOOTPRINT, obstacleErrors, obstacleFootprint } from './obstacle';
import type { Profile } from './profile';
import type { TileSweep } from './sweep';

const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);

const profile: Profile = {
    position: 2,
    roadWidth: 3,
    leftShoulder: 1,
    rightShoulder: 1,
    height: 5,
    road: 1,
    shoulder: 1,
    landscape: 1,
};
const straight: TileSweep = {
    center: { x: 0, y: 0 },
    heading: 0,
    exit: 12,
    entry: profile,
    exitProfile: profile,
};
const sharp: TileSweep = { ...straight, exit: 4 };

describe('obstacles', () => {
    it('pose un hazard au centre de la piste, orienté le long de la piste', () => {
        const { outline } = obstacleFootprint(straight, {
            kind: 'hazard',
            size: 'medium',
            at: 0.5,
            offset: 0,
        });
        // Centre de la piste sur une droite orientée au nord : unité 3,5 de la face, soit x = -0,5.
        const xs = outline.map((p) => p.x);
        const ys = outline.map((p) => p.y);
        expect(close(Math.min(...xs), -1) && close(Math.max(...xs), 0)).toBe(true);
        expect(close(Math.min(...ys), -1) && close(Math.max(...ys), 1)).toBe(true);
        expect(HAZARD_FOOTPRINT.large).toEqual({ length: 2, width: 2 });
    });

    it('suit le décalage latéral : offset positif à droite du conducteur', () => {
        const { outline } = obstacleFootprint(straight, {
            kind: 'hazard',
            size: 'small',
            at: 0.25,
            offset: 2,
        });
        const cx = outline.reduce((sum, p) => sum + p.x, 0) / 4;
        const cy = outline.reduce((sum, p) => sum + p.y, 0) / 4;
        expect(close(cx, -0.5 + 2)).toBe(true);
        expect(close(cy, -APOTHEM + 2 * APOTHEM * 0.25)).toBe(true);
    });

    it('fait courir une barrière du bord de la piste à une unité vers l’extérieur, d’une face à l’autre', () => {
        const { outline, body } = obstacleFootprint(straight, {
            kind: 'barrier',
            side: 'right',
            from: 0,
            to: 1,
        });
        // Bord droit de la piste : unité 5 → x = 1 ; emprise jusqu'à x = 2.
        expect(outline.every((p) => p.x >= 1 - 1e-9 && p.x <= 2 + 1e-9)).toBe(true);
        expect(close(Math.min(...outline.map((p) => p.y)), -APOTHEM)).toBe(true);
        expect(close(Math.max(...outline.map((p) => p.y)), APOTHEM)).toBe(true);
        expect(body.every((p) => p.x >= 1.7 - 1e-9)).toBe(true);
    });

    it('épouse la courbe d’une épingle', () => {
        const { outline } = obstacleFootprint(sharp, { kind: 'ramp', from: 0.3, to: 0.7 });
        // Rayon d'un point à l'unité u depuis le sommet commun aux faces 6 et 4 : 8 - u.
        // La piste va de l'unité 2 à 5, donc toute la rampe est entre les rayons 3 et 6.
        const vertex = { x: SIDE / 2, y: -APOTHEM };
        expect(
            outline.every((p) => dist(p, vertex) >= 3 - 1e-9 && dist(p, vertex) <= 6 + 1e-9),
        ).toBe(true);
        expect(outline.length).toBeGreaterThan(8);
    });

    it('refuse les fractions hors de la tuile et les intervalles vides', () => {
        expect(
            obstacleErrors(straight, { kind: 'hazard', size: 'small', at: 1.2, offset: 0 }),
        ).toEqual(['hazard small à 1.2 : position 1.2 hors de 0 à 1']);
        expect(obstacleErrors(straight, { kind: 'ramp', from: 0.6, to: 0.4 })).toEqual([
            'ramp : intervalle 0.6 à 0.4 vide',
        ]);
    });

    it('refuse un hazard qui déborde de la tuile, accepte celui qui tient', () => {
        expect(
            obstacleErrors(straight, { kind: 'hazard', size: 'large', at: 0.02, offset: 3 }),
        ).toEqual(['hazard large à 0.02 : déborde de la tuile']);
        expect(
            obstacleErrors(straight, { kind: 'hazard', size: 'large', at: 0.5, offset: 3 }),
        ).toEqual([]);
        expect(obstacleErrors(sharp, { kind: 'barrier', side: 'left', from: 0, to: 1 })).toEqual(
            [],
        );
    });
});
