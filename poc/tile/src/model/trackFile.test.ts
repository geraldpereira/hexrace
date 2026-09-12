import { describe, expect, it } from 'vitest';
import { catalogue } from './fixtures/catalogue';
import { courbes } from './fixtures/courbes';
import { petitAnneau } from './fixtures/petitAnneau';
import { hexagone, invalide, ligne, recoupe, relief, triangle } from './fixtures/petitesBoucles';
import { parseObstacle, parseTrack, serializeObstacle, serializeTrack } from './trackFile';

const croquis6 = `hexrace-track 1

id: europe-ring-01
name: Petit Anneau
environment: europe
mode: track
laps: 3

# Une ligne par tuile, dans l'ordre de parcours. L'entrée est toujours la face 6.
[tiles]
start  exit=12  pos=2 w=3  sh=1,1  h=5  t=1/1/1
       exit=2   pos=2 w=3  sh=1,1  h=5  t=1/1/1
       exit=12  pos=2 w=3  sh=1,1  h=6  t=1/1/1   obs=bump@0.45-0.55
       exit=2   pos=2 w=3  sh=1,1  h=6  t=2/1/1
       exit=12  pos=3 w=2  sh=1,1  h=6  t=2/1/1
       exit=2   pos=3 w=2  sh=1,1  h=6  t=2/1/1   obs=barrier:left,barrier:right
       exit=12  pos=3 w=2  sh=1,1  h=7  t=2/1/1   obs=ramp@0.4-0.55
       exit=2   pos=3 w=2  sh=1,1  h=7  t=2/1/1
       exit=12  pos=2 w=3  sh=1,1  h=6  t=1/1/1
       exit=2   pos=2 w=3  sh=1,1  h=6  t=1/1/1   obs=hazard:small@0.5/1
       exit=12  pos=2 w=3  sh=1,1  h=5  t=1/1/1
       exit=2   pos=2 w=3  sh=1,1  h=5  t=1/1/1
`;

describe('fichier de piste', () => {
    it('lit le fichier du croquis 6', () => {
        const { track, errors } = parseTrack(croquis6);
        expect(errors).toEqual([]);
        expect(track?.name).toBe('Petit Anneau');
        expect(track?.laps).toBe(3);
        expect(track?.tiles).toHaveLength(12);
        expect(track?.tiles[4]?.profile).toMatchObject({
            position: 3,
            roadWidth: 2,
            height: 6,
            road: 2,
        });
        expect(track?.tiles[5]?.obstacles).toEqual([
            { kind: 'barrier', side: 'left', from: 0, to: 1 },
            { kind: 'barrier', side: 'right', from: 0, to: 1 },
        ]);
        expect(track?.tiles[9]?.obstacles).toEqual([
            { kind: 'hazard', size: 'small', at: 0.5, offset: 1 },
        ]);
    });

    it.each([
        petitAnneau,
        triangle,
        hexagone,
        ligne,
        relief,
        recoupe,
        invalide,
        courbes,
        catalogue,
    ])('réécrit puis relit $name à l’identique', (fixture) => {
        const { track, errors } = parseTrack(serializeTrack(fixture));
        expect(errors).toEqual([]);
        expect(track).toEqual(fixture);
    });

    it('écrit et relit chaque sorte d’obstacle', () => {
        const samples = [
            'hazard:large@0.6/-2.5',
            'hazard:small@0.5',
            'barrier:left',
            'barrier:right@0.3-1',
            'ramp@0.4-0.55',
            'bump@0.45-0.55',
            'patch:3@0.3-0.7/-0.5x1.5',
            'patch:2@0.1-0.2',
        ];
        for (const text of samples) {
            const obstacle = parseObstacle(text);
            expect(obstacle, text).not.toBeNull();
            if (obstacle) expect(serializeObstacle(obstacle)).toBe(text);
        }
        expect(parseObstacle('hazard:huge@0.5')).toBeNull();
        expect(parseObstacle('barrier@0.2')).toBeNull();
    });

    it('dit ce qui ne va pas, avec le numéro de ligne', () => {
        const broken = `hexrace-track 1
id: x
name: X
environment: mars
mode: drift
[tiles]
start exit=7 pos=2 w=3 h=5 t=1/1/1
start exit=12 pos=deux w=3 sh=1,1 h=5 t=1/1/1 foo=1
      exit=12 pos=2 w=3 h=5 t=1/1/1 obs=hazard:tiny@0.5
`;
        const { track, errors } = parseTrack(broken);
        expect(track).toBeNull();
        expect(errors).toEqual([
            'ligne 7 : exit « 7 » invalide, attendu 12, 2, 4, 8 ou 10',
            "ligne 8 : « start » n'est permis que sur la première tuile",
            'ligne 8 : pos « deux » invalide, attendu un entier',
            'ligne 8 : clé « foo » inconnue',
            'ligne 9 : obstacle « hazard:tiny@0.5 » invalide',
            'en-tête : environnement « mars » inconnu',
            'en-tête : mode « drift » inconnu, attendu track ou rally',
        ]);
    });

    it('refuse un mauvais format ou une mauvaise version', () => {
        expect(parseTrack('hexrace-board 1\n[tiles]\n').errors[0]).toContain('première ligne');
        expect(parseTrack('hexrace-track 2\n[tiles]\n').errors[0]).toContain('version 2 inconnue');
        expect(parseTrack('').errors).toContain('fichier vide : attendu « hexrace-track 1 »');
    });
});
