import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { catalogue } from './fixtures/catalogue';
import { courbes } from './fixtures/courbes';
import { petitAnneau } from './fixtures/petitAnneau';
import { hexagone, ligne, recoupe, relief, triangle } from './fixtures/petitesBoucles';
import { parseTrack } from './trackFile';
import type { Track } from './track';

const fixtures: Track[] = [
    petitAnneau,
    triangle,
    hexagone,
    ligne,
    relief,
    recoupe,
    courbes,
    catalogue,
];

/** Les fichiers tracks/*.track sont la sortie de `npm run tracks` : ils doivent rester égaux aux fixtures. */
describe('fichiers tracks/', () => {
    const files = readdirSync('tracks').filter((f) => f.endsWith('.track'));

    it('un fichier par fixture, pas un de plus', () => {
        expect(files.sort()).toEqual(fixtures.map((t) => `${t.id}.track`).sort());
    });

    it.each(fixtures)('$id.track se lit et vaut la fixture', (fixture) => {
        const { track, errors } = parseTrack(readFileSync(`tracks/${fixture.id}.track`, 'utf8'));
        expect(errors).toEqual([]);
        expect(track).toEqual(fixture);
    });
});
