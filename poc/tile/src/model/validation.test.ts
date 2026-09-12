import { describe, expect, it } from 'vitest';
import { catalogue } from './fixtures/catalogue';
import { courbes } from './fixtures/courbes';
import { petitAnneau } from './fixtures/petitAnneau';
import { hexagone, invalide, ligne, recoupe, relief, triangle } from './fixtures/petitesBoucles';
import type { Track } from './track';
import { formatIssue, isValid, validateTrack } from './validation';

describe('validation', () => {
    it.each([petitAnneau, triangle, hexagone, ligne, relief, courbes, catalogue])(
        '$name est valide',
        (track) => {
            expect(validateTrack(track).issues).toEqual([]);
        },
    );

    it('désigne la tuile qui en recouvre une autre', () => {
        const v = validateTrack(recoupe);
        expect(v.issues.map(formatIssue)).toEqual(['tuile 6 : recouvre la tuile 0 en (0,0)']);
        expect([...v.faulty]).toEqual([6]);
        expect(isValid(v)).toBe(false);
    });

    it('désigne la dernière tuile quand la boucle ne se referme pas', () => {
        const ouverte: Track = { ...petitAnneau, tiles: petitAnneau.tiles.slice(0, 11) };
        const v = validateTrack(ouverte);
        expect(v.issues).toHaveLength(1);
        expect(v.issues[0]?.tile).toBe(10);
        expect(v.issues[0]?.message).toContain('ne se referme pas');
    });

    it('cumule profil invalide, obstacle qui déborde et en-tête douteux', () => {
        const v = validateTrack(invalide);
        expect(v.issues.map(formatIssue)).toEqual([
            'nombre de tours sans objet hors du mode Track',
            "tuile 1 : pas de paysage à gauche : le bloc commence à l'unité 0",
            'tuile 2 : hazard large à 0.05 : déborde de la tuile',
        ]);
        expect([...v.faulty].sort()).toEqual([1, 2]);
    });
});
