import { describe, expect, it } from 'vitest';
import { catalogue } from './fixtures/catalogue';
import { courbes } from './fixtures/courbes';
import { petitAnneau } from './fixtures/petitAnneau';
import { hexagone, ligne, triangle } from './fixtures/petitesBoucles';
import { closureError, overlapErrors, placeTrack } from './placement';
import { trackErrors } from './track';

describe('fixtures', () => {
    it.each([petitAnneau, triangle, hexagone, ligne, courbes, catalogue])(
        '$name est valide',
        (track) => {
            const placement = placeTrack(track);
            expect(trackErrors(track)).toEqual([]);
            expect(overlapErrors(placement)).toEqual([]);
            expect(closureError(track, placement)).toBeNull();
        },
    );
});
