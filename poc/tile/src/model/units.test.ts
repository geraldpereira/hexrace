import { describe, expect, it } from 'vitest';
import { ligne } from './fixtures/petitesBoucles';
import { GENERATOR_SLOPE_FACTOR, MAX_SLOPE, maxHeightSteps, slopeOf } from './slope';
import type { Track } from './track';
import { HEIGHT_UNIT } from './units';
import { validateTrack } from './validation';

describe('unités et pentes', () => {
    it('convertit les pas de 20 cm en unités de largeur de voiture', () => {
        expect(HEIGHT_UNIT).toBeCloseTo(0.2 / 1.7, 12);
    });

    it('donne les déclivités maximales de la spec : 23, 16 et 7 pas, et la moitié pour le générateur', () => {
        expect(maxHeightSteps(12)).toBe(23);
        expect(maxHeightSteps(2)).toBe(16);
        expect(maxHeightSteps(4)).toBe(7);
        expect(maxHeightSteps(12, GENERATOR_SLOPE_FACTOR)).toBe(11);
        expect(maxHeightSteps(2, GENERATOR_SLOPE_FACTOR)).toBe(8);
        expect(maxHeightSteps(4, GENERATOR_SLOPE_FACTOR)).toBe(3);
        expect(slopeOf(12, 23)).toBeLessThanOrEqual(MAX_SLOPE.straight);
        expect(slopeOf(12, 24)).toBeGreaterThan(MAX_SLOPE.straight);
    });

    it('accepte la Ligne droite à 23 pas et refuse une tuile plus pentue', () => {
        expect(validateTrack(ligne).issues).toEqual([]);
        const steep: Track = {
            ...ligne,
            tiles: ligne.tiles.map((t, i) =>
                i === 2 ? { ...t, profile: { ...t.profile, height: 60 } } : t,
            ),
        };
        expect(validateTrack(steep).issues.map((i) => i.message)).toEqual([
            'pente de 24 % en ligne droite, au plus 20 %',
        ]);
    });
});
