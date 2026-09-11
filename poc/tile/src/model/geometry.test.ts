import { describe, expect, it } from 'vitest';
import { EXIT_FACES } from './face';
import { HEX_AREA, polygonArea, tilePolygons } from './geometry';
import { cellToWorld } from './layout';
import type { Heading } from './placement';
import type { Profile } from './profile';
import type { TileSweep } from './sweep';

const wideLeft: Profile = {
    position: 1,
    roadWidth: 4,
    leftShoulder: 0,
    rightShoulder: 1,
    height: 3,
    road: 1,
    shoulder: 2,
    landscape: 1,
};
const narrowRight: Profile = {
    ...wideLeft,
    position: 5,
    roadWidth: 1,
    leftShoulder: 1,
    rightShoulder: 1,
    road: 3,
};

describe('polygones d’une tuile', () => {
    it('recouvre exactement l’hexagone, pour toute sortie et toute orientation, avec transition', () => {
        for (let h = 0; h < 6; h++) {
            for (const exit of EXIT_FACES) {
                const sweep: TileSweep = {
                    center: cellToWorld({ q: 1, r: -2 }),
                    heading: h as Heading,
                    exit,
                    entry: wideLeft,
                    exitProfile: narrowRight,
                    transition: { start: 0, end: 1 },
                };
                const total = tilePolygons(sweep, 48).reduce(
                    (sum, p) => sum + Math.abs(polygonArea(p.points)),
                    0,
                );
                expect(Math.abs(total - HEX_AREA) / HEX_AREA).toBeLessThan(0.003);
            }
        }
    });

    it('porte les types d’entrée sur la première moitié et de sortie sur la seconde', () => {
        const sweep: TileSweep = {
            center: { x: 0, y: 0 },
            heading: 0,
            exit: 12,
            entry: wideLeft,
            exitProfile: narrowRight,
        };
        const roads = tilePolygons(sweep).filter((p) => p.zone === 'road');
        expect(roads.map((p) => p.type)).toEqual([1, 3]);
        const shoulders = tilePolygons(sweep).filter((p) => p.zone === 'shoulder');
        expect(shoulders).toHaveLength(4);
    });

    it('n’émet pas de bas-côté quand il n’y en a ni à l’entrée ni à la sortie', () => {
        const none: Profile = { ...wideLeft, position: 2, leftShoulder: 0, rightShoulder: 0 };
        const sweep: TileSweep = {
            center: { x: 0, y: 0 },
            heading: 0,
            exit: 2,
            entry: none,
            exitProfile: none,
        };
        expect(tilePolygons(sweep).filter((p) => p.zone === 'shoulder')).toHaveLength(0);
    });

    it('réduit un paysage au seul sommet commun en épingle', () => {
        const sweep: TileSweep = {
            center: { x: 0, y: 0 },
            heading: 0,
            exit: 4,
            entry: wideLeft,
            exitProfile: wideLeft,
        };
        const right = tilePolygons(sweep, 8).find(
            (p) => p.zone === 'landscape' && p.side === 'right',
        );
        // 9 échantillons du bord droit du bloc + 1 sommet.
        expect(right?.points).toHaveLength(10);
    });
});
