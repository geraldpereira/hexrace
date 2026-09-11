import { describe, expect, it } from 'vitest';
import type { Profile } from './profile';
import { blockEnd, blockStart, isValidProfile, profileErrors, sameProfile, zones } from './profile';

const croquis3: Profile = {
    position: 2,
    roadWidth: 3,
    leftShoulder: 1,
    rightShoulder: 1,
    height: 5,
    road: 1,
    shoulder: 1,
    landscape: 1,
};

describe('profil', () => {
    it('reproduit le croquis 3 : paysage, bas-côté, trois de piste, bas-côté, deux de paysage', () => {
        expect(zones(croquis3)).toEqual([
            'landscape',
            'shoulder',
            'road',
            'road',
            'road',
            'shoulder',
            'landscape',
            'landscape',
        ]);
        expect(blockStart(croquis3)).toBe(1);
        expect(blockEnd(croquis3)).toBe(6);
        expect(isValidProfile(croquis3)).toBe(true);
    });

    it('accepte une piste de 5 avec un seul bas-côté, refuse avec deux', () => {
        expect(isValidProfile({ ...croquis3, position: 1, roadWidth: 5, leftShoulder: 0 })).toBe(
            true,
        );
        expect(profileErrors({ ...croquis3, position: 2, roadWidth: 5 })).toEqual([
            'piste plus bas-côtés font 7 unités, au plus 6',
            "pas de paysage à droite : le bloc finit à l'unité 8",
        ]);
    });

    it('exige une unité de paysage de chaque côté', () => {
        expect(profileErrors({ ...croquis3, position: 1 })).toEqual([
            "pas de paysage à gauche : le bloc commence à l'unité 0",
        ]);
        expect(profileErrors({ ...croquis3, position: 4 })).toEqual([
            "pas de paysage à droite : le bloc finit à l'unité 8",
        ]);
    });

    it('borne la largeur de piste et la hauteur', () => {
        expect(profileErrors({ ...croquis3, roadWidth: 0 })).toContain(
            'piste de 0 unités, attendu de 1 à 5',
        );
        expect(profileErrors({ ...croquis3, height: 0 })).toContain(
            'hauteur 0, attendu un entier de 1 à 20',
        );
        expect(profileErrors({ ...croquis3, height: 21 })).toHaveLength(1);
        expect(profileErrors({ ...croquis3, height: 2.5 })).toHaveLength(1);
    });

    it('compare les profils en tout point', () => {
        expect(sameProfile(croquis3, { ...croquis3 })).toBe(true);
        expect(sameProfile(croquis3, { ...croquis3, landscape: 2 })).toBe(false);
        expect(sameProfile(croquis3, { ...croquis3, height: 6 })).toBe(false);
    });
});
