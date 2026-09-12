import { describe, expect, it } from 'vitest';
import { catalogue } from './fixtures/catalogue';
import { validateTrack } from './validation';
import { courbes } from './fixtures/courbes';
import { petitAnneau } from './fixtures/petitAnneau';
import { hexagone, ligne, relief, triangle } from './fixtures/petitesBoucles';
import { placedObstacleErrors } from './obstacle';
import { closureError, overlapErrors, placeTrack } from './placement';
import { trackErrors } from './track';

describe('fixtures', () => {
    it.each([petitAnneau, hexagone, ligne, relief, courbes, catalogue])(
        '$name est valide',
        (track) => {
            const placement = placeTrack(track);
            expect(trackErrors(track)).toEqual([]);
            expect(overlapErrors(placement)).toEqual([]);
            expect(placedObstacleErrors(placement)).toEqual([]);
            expect(closureError(track, placement)).toBeNull();
        },
    );
});

describe('boucle en épingles', () => {
    it('Triangle se referme mais part en épingle', () => {
        const placement = placeTrack(triangle);
        expect(closureError(triangle, placement)).toBeNull();
        expect(overlapErrors(placement)).toEqual([]);
        expect(validateTrack(triangle).issues.map((i) => i.message)).toEqual([
            "la tuile de départ et d'arrivée ne peut pas être une épingle",
        ]);
    });
});
