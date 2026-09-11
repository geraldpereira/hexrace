import { describe, expect, it } from 'vitest';
import { EXIT_FACES } from './face';
import { cellToWorld, entryFrame, exitFrame, facePoint } from './layout';
import type { Heading } from './placement';
import { exitHeading } from './placement';
import type { Profile } from './profile';
import { boundariesAt } from './sweep';
import type { TileSweep } from './sweep';

const close = (a: number, b: number) => Math.abs(a - b) < 1e-6;
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    Math.hypot(a.x - b.x, a.y - b.y);

const narrowLeft: Profile = {
    position: 2,
    roadWidth: 1,
    leftShoulder: 1,
    rightShoulder: 1,
    height: 3,
    road: 1,
    shoulder: 1,
    landscape: 1,
};
const narrowRight: Profile = { ...narrowLeft, position: 5 };
const wide: Profile = { ...narrowLeft, position: 1, roadWidth: 5, rightShoulder: 0 };

describe('balayage des zones', () => {
    it('garde la largeur de la piste et des bas-côtés constante pendant un décalage en virage', () => {
        for (const exit of EXIT_FACES) {
            const sweep: TileSweep = {
                center: { x: 0, y: 0 },
                heading: 0,
                exit,
                entry: narrowLeft,
                exitProfile: narrowRight,
            };
            for (let i = 0; i <= 40; i++) {
                const b = boundariesAt(sweep, i / 40);
                expect(close(dist(b.roadLeft, b.roadRight), 1)).toBe(true);
                expect(close(dist(b.blockLeft, b.blockRight), 3)).toBe(true);
            }
        }
    });

    it('tombe exactement sur les profils des faces aux deux bouts', () => {
        for (let h = 0; h < 6; h++) {
            const heading = h as Heading;
            const center = cellToWorld({ q: -1, r: 2 });
            for (const exit of EXIT_FACES) {
                const sweep: TileSweep = {
                    center,
                    heading,
                    exit,
                    entry: wide,
                    exitProfile: narrowRight,
                };
                const inn = entryFrame(center, heading);
                const out = exitFrame(center, exitHeading(heading, exit));
                const start = boundariesAt(sweep, 0);
                const end = boundariesAt(sweep, 1);
                expect(dist(start.blockLeft, facePoint(inn, 0))).toBeLessThan(1e-6);
                expect(dist(start.roadLeft, facePoint(inn, 1))).toBeLessThan(1e-6);
                expect(dist(start.roadRight, facePoint(inn, 6))).toBeLessThan(1e-6);
                expect(dist(start.blockRight, facePoint(inn, 6))).toBeLessThan(1e-6);
                expect(dist(end.blockLeft, facePoint(out, 4))).toBeLessThan(1e-6);
                expect(dist(end.roadRight, facePoint(out, 6))).toBeLessThan(1e-6);
                expect(dist(end.blockRight, facePoint(out, 7))).toBeLessThan(1e-6);
            }
        }
    });
});
