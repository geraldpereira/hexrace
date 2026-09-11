import { describe, expect, it } from 'vitest';
import { EXIT_FACES } from './face';
import { APOTHEM, SIDE, cellToWorld, entryFrame, exitFrame, facePoint } from './layout';
import {
    lerpSpan,
    localPath,
    pathLength,
    profilePoint,
    transition,
    transitionOfExtent,
    worldPath,
} from './path';
import type { Heading } from './placement';
import { exitHeading } from './placement';

const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;
const samePoint = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    close(a.x, b.x) && close(a.y, b.y);

describe('axe d’une tuile', () => {
    it('part du milieu de la face 6 vers le nord, la droite à l’est', () => {
        for (const exit of EXIT_FACES) {
            const { point, travel, right } = localPath(exit, 0);
            expect(samePoint(point, { x: 0, y: -APOTHEM })).toBe(true);
            expect(samePoint(travel, { x: 0, y: 1 })).toBe(true);
            expect(samePoint(right, { x: 1, y: 0 })).toBe(true);
        }
    });

    it('arrive au milieu de la face de sortie, dans la direction de sortie, quelle que soit l’orientation', () => {
        for (let h = 0; h < 6; h++) {
            const heading = h as Heading;
            const center = cellToWorld({ q: 2, r: -1 });
            for (const exit of EXIT_FACES) {
                const out = exitFrame(center, exitHeading(heading, exit));
                const end = worldPath(center, heading, exit, 1);
                expect(samePoint(end.point, facePoint(out, SIDE / 2))).toBe(true);
                expect(samePoint(end.travel, out.travel)).toBe(true);
                expect(samePoint(profilePoint(end, 0), facePoint(out, 0))).toBe(true);
                const inn = entryFrame(center, heading);
                const begin = worldPath(center, heading, exit, 0);
                expect(samePoint(profilePoint(begin, SIDE), facePoint(inn, SIDE))).toBe(true);
            }
        }
    });

    it('garde une vitesse constante le long de l’axe', () => {
        for (const exit of EXIT_FACES) {
            const n = 50;
            let previous = localPath(exit, 0).point;
            const step = pathLength(exit) / n;
            for (let i = 1; i <= n; i++) {
                const { point } = localPath(exit, i / n);
                expect(
                    Math.abs(Math.hypot(point.x - previous.x, point.y - previous.y) - step),
                ).toBeLessThan(step * 0.01);
                previous = point;
            }
        }
    });

    it('mesure la droite, le virage large et le virage serré', () => {
        expect(close(pathLength(12), 2 * APOTHEM)).toBe(true);
        expect(close(pathLength(2), (12 * Math.PI) / 3)).toBe(true);
        expect(close(pathLength(8), (4 * 2 * Math.PI) / 3)).toBe(true);
    });

    it('réduit le bord intérieur d’un virage serré au sommet commun', () => {
        const mid = localPath(4, 0.5);
        const inner = profilePoint(mid, SIDE);
        expect(samePoint(inner, { x: SIDE / 2, y: -APOTHEM })).toBe(true);
        const left = localPath(8, 0.5);
        expect(samePoint(profilePoint(left, 0), { x: -SIDE / 2, y: -APOTHEM })).toBe(true);
    });

    it('fait la transition au milieu de la tuile seulement', () => {
        expect(lerpSpan([1, 4], [3, 5], 0.2)).toEqual([1, 4]);
        expect(lerpSpan([1, 4], [3, 5], 0.5)).toEqual([2, 4.5]);
        expect(lerpSpan([1, 4], [3, 5], 0.9)).toEqual([3, 5]);
    });
});

describe('étendue de la transition', () => {
    it('reste finie aux deux faces quelle que soit l’étendue', () => {
        for (const extent of [0.2, 0.4, 1]) {
            const span = transitionOfExtent(extent);
            expect(transition(0, span)).toBe(0);
            expect(transition(1, span)).toBe(1);
            expect(transition(0.5, span)).toBeCloseTo(0.5, 9);
        }
        expect(transitionOfExtent(1)).toEqual({ start: 0, end: 1 });
    });
});
