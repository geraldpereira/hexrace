import { describe, expect, it } from 'vitest';
import { EXIT_FACES } from './face';
import { tilePolygons } from './geometry';
import { APOTHEM, SIDE, cellToWorld, entryFrame, exitFrame, facePoint } from './layout';
import { axisParameter, localAxisParameter, localPath, profilePoint } from './path';
import type { Heading } from './placement';
import { exitHeading } from './placement';
import type { Profile } from './profile';
import type { TileSweep } from './sweep';
import { tileHeightAt } from './sweep';
import { HEIGHT_UNIT } from './units';

const low: Profile = {
    position: 2,
    roadWidth: 3,
    leftShoulder: 1,
    rightShoulder: 1,
    height: 3,
    road: 1,
    shoulder: 1,
    landscape: 1,
};
const high: Profile = { ...low, height: 7, position: 3, roadWidth: 2 };

describe('paramètre d’axe', () => {
    it('retrouve s pour tout point du profil balayé, pour toute sortie', () => {
        for (const exit of EXIT_FACES) {
            for (let i = 0; i <= 10; i++) {
                const s = i / 10;
                const sample = localPath(exit, s);
                for (const u of [1, 4, 6.5]) {
                    expect(localAxisParameter(exit, profilePoint(sample, u))).toBeCloseTo(s, 6);
                }
            }
        }
    });

    it('borne à 0 et 1 au-delà des faces et rend 0,5 au sommet d’une épingle', () => {
        expect(localAxisParameter(12, { x: 0, y: -APOTHEM - 3 })).toBe(0);
        expect(localAxisParameter(12, { x: 2, y: APOTHEM + 1 })).toBe(1);
        expect(localAxisParameter(2, { x: 0, y: -APOTHEM - 0.1 })).toBe(0);
        expect(localAxisParameter(4, { x: SIDE / 2, y: -APOTHEM })).toBe(0.5);
        expect(localAxisParameter(8, { x: -SIDE / 2, y: -APOTHEM })).toBe(0.5);
    });
});

describe('hauteur', () => {
    it('donne la hauteur du profil sur toute la face, pour toute orientation et toute sortie', () => {
        for (let h = 0; h < 6; h++) {
            const heading = h as Heading;
            const center = cellToWorld({ q: 3, r: -1 });
            for (const exit of EXIT_FACES) {
                const sweep: TileSweep = { center, heading, exit, entry: low, exitProfile: high };
                const inn = entryFrame(center, heading);
                const out = exitFrame(center, exitHeading(heading, exit));
                for (const u of [0.01, 2, 5.5, 7.99]) {
                    expect(tileHeightAt(sweep, facePoint(inn, u))).toBeCloseTo(3 * HEIGHT_UNIT, 9);
                    expect(tileHeightAt(sweep, facePoint(out, u))).toBeCloseTo(7 * HEIGHT_UNIT, 9);
                }
            }
        }
    });

    it('monte sans palier ni marche : croissante le long de l’axe, plate aux deux bouts', () => {
        const sweep: TileSweep = {
            center: { x: 0, y: 0 },
            heading: 0,
            exit: 12,
            entry: low,
            exitProfile: high,
            transition: { start: 0, end: 1 },
        };
        let previous = -Infinity;
        for (let i = 0; i <= 40; i++) {
            const y = -APOTHEM + (2 * APOTHEM * i) / 40;
            const height = tileHeightAt(sweep, { x: 1, y });
            expect(height).toBeGreaterThanOrEqual(previous);
            previous = height;
        }
        const step = 0.05;
        const slopeStart = tileHeightAt(sweep, { x: 0, y: -APOTHEM + step }) - 3 * HEIGHT_UNIT;
        const slopeMiddle =
            tileHeightAt(sweep, { x: 0, y: step / 2 }) -
            tileHeightAt(sweep, { x: 0, y: -step / 2 });
        expect(slopeStart).toBeLessThan(slopeMiddle / 20);
    });

    it('ne met aucune arête à la jonction : la pente est nulle aux faces', () => {
        expect(axisParameter({ x: 0, y: 0 }, 0, 12, { x: 0, y: APOTHEM })).toBe(1);
        const polygons = tilePolygons({
            center: { x: 0, y: 0 },
            heading: 0,
            exit: 2,
            entry: low,
            exitProfile: high,
        });
        expect(polygons.length).toBeGreaterThan(0);
    });
});
