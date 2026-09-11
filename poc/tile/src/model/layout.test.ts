import { describe, expect, it } from 'vitest';
import {
    APOTHEM,
    PITCH,
    SIDE,
    cellToWorld,
    directionVector,
    entryFrame,
    exitFrame,
    facePoint,
    hexCorners,
} from './layout';
import type { Heading } from './placement';
import { HEADING_OFFSETS, neighbor } from './placement';

const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;

describe('coordonnées du monde', () => {
    it('met les voisins à un pas de centre à centre, dans la direction annoncée', () => {
        for (let h = 0; h < 6; h++) {
            const there = cellToWorld(neighbor({ q: 0, r: 0 }, h as Heading));
            const dir = directionVector(h as Heading);
            expect(close(there.x, PITCH * dir.x)).toBe(true);
            expect(close(there.y, PITCH * dir.y)).toBe(true);
        }
        expect(HEADING_OFFSETS).toHaveLength(6);
    });

    it('a des sommets à un côté du centre et des faces à une apothème', () => {
        const corners = hexCorners({ x: 0, y: 0 });
        for (const c of corners) expect(close(Math.hypot(c.x, c.y), SIDE)).toBe(true);
        expect(close(APOTHEM, (SIDE * Math.sqrt(3)) / 2)).toBe(true);
    });

    it('place la face d’entrée d’une tuile au nord en bas, la gauche du conducteur à l’ouest', () => {
        const frame = entryFrame({ x: 0, y: 0 }, 0);
        const left = facePoint(frame, 0);
        const right = facePoint(frame, SIDE);
        expect(close(left.x, -SIDE / 2) && close(left.y, -APOTHEM)).toBe(true);
        expect(close(right.x, SIDE / 2) && close(right.y, -APOTHEM)).toBe(true);
    });

    it('fait coïncider la face de sortie d’une tuile et la face d’entrée de la suivante', () => {
        for (let h = 0; h < 6; h++) {
            const heading = h as Heading;
            const here = { x: 0, y: 0 };
            const there = cellToWorld(neighbor({ q: 0, r: 0 }, heading));
            const out = exitFrame(here, heading);
            const inn = entryFrame(there, heading);
            for (const u of [0, 2.5, SIDE]) {
                const a = facePoint(out, u);
                const b = facePoint(inn, u);
                expect(close(a.x, b.x) && close(a.y, b.y)).toBe(true);
            }
        }
    });
});
