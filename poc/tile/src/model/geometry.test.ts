import { describe, expect, it } from 'vitest';
import { EXIT_FACES } from './face';
import {
    APEX_RADIUS,
    HEX_AREA,
    polygonArea,
    tileBoundary,
    tilePolygons,
    tileQuads,
} from './geometry';
import { APOTHEM, SIDE, cellToWorld } from './layout';
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

    it('laisse un trou minuscule au sommet commun en épingle, jamais le sommet lui-même', () => {
        const sweep: TileSweep = {
            center: { x: 0, y: 0 },
            heading: 0,
            exit: 4,
            entry: wideLeft,
            exitProfile: wideLeft,
        };
        const vertex = { x: 4, y: -APOTHEM };
        const inner = tilePolygons(sweep, 8).filter(
            (p) => p.zone === 'landscape' && p.side === 'right',
        );
        expect(inner.length).toBeGreaterThan(0);
        for (const poly of inner) {
            for (const p of poly.points) {
                const d = Math.hypot(p.x - vertex.x, p.y - vertex.y);
                expect(d).toBeGreaterThan(APEX_RADIUS - 1e-9);
            }
        }
    });

    it('donne un contour qui suit exactement l’hexagone, sommets compris', () => {
        for (const exit of EXIT_FACES) {
            const sweep: TileSweep = {
                center: { x: 0, y: 0 },
                heading: 2,
                exit,
                entry: wideLeft,
                exitProfile: narrowRight,
            };
            const boundary = tileBoundary(sweep);
            expect(Math.abs(Math.abs(polygonArea(boundary)) - HEX_AREA) / HEX_AREA).toBeLessThan(
                1e-4,
            );
            for (const p of boundary) {
                expect(Math.hypot(p.x, p.y)).toBeLessThanOrEqual(SIDE + 1e-6);
            }
        }
    });
});

describe('tranches', () => {
    it('met tous les points d’une tranche au même avancement et les quadrilatères entre deux tranches voisines', () => {
        const sweep: TileSweep = {
            center: { x: 0, y: 0 },
            heading: 0,
            exit: 2,
            entry: wideLeft,
            exitProfile: narrowRight,
        };
        for (const quad of tileQuads(sweep)) {
            const values = [...new Set(quad.points.map((p) => p.s))];
            expect(values).toHaveLength(2);
        }
    });
});
