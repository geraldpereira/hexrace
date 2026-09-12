import { describe, expect, it } from 'vitest';
import { petitAnneau } from './fixtures/petitAnneau';
import { sameProfile } from './profile';
import type { Track } from './track';
import { entryProfile, tileProfiles, trackErrors } from './track';

describe('piste', () => {
    it('donne à chaque tuile le profil de sortie de la précédente', () => {
        for (let i = 1; i < petitAnneau.tiles.length; i++) {
            const previous = petitAnneau.tiles[i - 1]?.profile;
            expect(previous && sameProfile(entryProfile(petitAnneau, i), previous)).toBe(true);
        }
    });

    it('referme la boucle : la tuile de départ entre par la sortie de la dernière', () => {
        const last = petitAnneau.tiles.at(-1)?.profile;
        expect(last && sameProfile(entryProfile(petitAnneau, 0), last)).toBe(true);
    });

    it('en Rally, la tuile de départ est uniforme', () => {
        const { laps: _laps, ...line } = petitAnneau;
        const rally: Track = { ...line, mode: 'rally' };
        const { entry, exit } = tileProfiles(rally, 0);
        expect(sameProfile(entry, exit)).toBe(true);
    });

    it('sait où la piste change au milieu de la tuile', () => {
        const { entry, exit } = tileProfiles(petitAnneau, 4);
        expect(entry.roadWidth).toBe(3);
        expect(exit.roadWidth).toBe(2);
        expect(entry.position).toBe(2);
        expect(exit.position).toBe(3);
    });

    it('valide le Petit Anneau', () => {
        expect(trackErrors(petitAnneau)).toEqual([]);
    });

    it('signale les profils invalides avec le numéro de tuile', () => {
        const tiles = petitAnneau.tiles.map((tile, i) =>
            i === 3 ? { ...tile, profile: { ...tile.profile, height: -1 } } : tile,
        );
        expect(trackErrors({ ...petitAnneau, tiles })).toEqual([
            'tuile 3 : hauteur -1, attendu un entier de 0 à 1000',
        ]);
    });

    it('refuse une piste vide, un mode inconnu et des tours hors Track', () => {
        const broken = { ...petitAnneau, mode: 'drift', tiles: [] } as unknown as Track;
        expect(trackErrors(broken)).toEqual([
            'mode inconnu : drift',
            'nombre de tours sans objet hors du mode Track',
            'aucune tuile',
        ]);
    });

    it('refuse un index hors de la piste', () => {
        expect(() => entryProfile(petitAnneau, 12)).toThrow(RangeError);
    });
});
