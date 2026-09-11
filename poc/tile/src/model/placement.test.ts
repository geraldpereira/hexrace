import { describe, expect, it } from 'vitest';
import { petitAnneau } from './fixtures/petitAnneau';
import { hexagone, ligne, recoupe, triangle } from './fixtures/petitesBoucles';
import type { Heading } from './placement';
import {
    HEADING_OFFSETS,
    closureError,
    exitHeading,
    neighbor,
    overlapErrors,
    placeTrack,
    turnHeading,
} from './placement';

describe('placement', () => {
    it('tourne modulo six', () => {
        expect(turnHeading(0, -1)).toBe(5);
        expect(turnHeading(5, 2)).toBe(1);
        expect(exitHeading(0, 12)).toBe(0);
        expect(exitHeading(0, 2)).toBe(1);
        expect(exitHeading(0, 10)).toBe(5);
        expect(exitHeading(4, 4)).toBe(0);
    });

    it('a six voisins distincts dont les directions opposées s’annulent', () => {
        for (let h = 0; h < 6; h++) {
            const there = neighbor({ q: 0, r: 0 }, h as Heading);
            const back = neighbor(there, turnHeading(h as Heading, 3));
            expect(back).toEqual({ q: 0, r: 0 });
        }
        expect(new Set(HEADING_OFFSETS.map((c) => `${c.q},${c.r}`)).size).toBe(6);
    });

    it('pose une ligne droite vers le nord', () => {
        const { tiles, next } = placeTrack(ligne);
        expect(tiles.map((t) => t.cell)).toEqual([
            { q: 0, r: 0 },
            { q: 0, r: 1 },
            { q: 0, r: 2 },
            { q: 0, r: 3 },
        ]);
        expect(tiles.every((t) => t.heading === 0)).toBe(true);
        expect(next).toEqual({ cell: { q: 0, r: 4 }, heading: 0 });
        expect(closureError(ligne, placeTrack(ligne))).toBeNull();
    });

    it('referme le Petit Anneau sur douze cases distinctes', () => {
        const placement = placeTrack(petitAnneau);
        expect(closureError(petitAnneau, placement)).toBeNull();
        expect(overlapErrors(placement)).toEqual([]);
        expect(new Set(placement.tiles.map((t) => `${t.cell.q},${t.cell.r}`)).size).toBe(12);
    });

    it('referme trois virages serrés autour d’un sommet', () => {
        const placement = placeTrack(triangle);
        expect(placement.tiles.map((t) => t.heading)).toEqual([0, 2, 4]);
        expect(closureError(triangle, placement)).toBeNull();
        expect(overlapErrors(placement)).toEqual([]);
    });

    it('referme six virages larges à gauche autour d’une tuile', () => {
        const placement = placeTrack(hexagone);
        expect(placement.tiles.map((t) => t.heading)).toEqual([0, 5, 4, 3, 2, 1]);
        expect(closureError(hexagone, placement)).toBeNull();
        expect(overlapErrors(placement)).toEqual([]);
    });

    it('dit où l’on arrive quand la boucle ne se referme pas', () => {
        const ouverte = { ...petitAnneau, tiles: petitAnneau.tiles.slice(0, 11) };
        expect(closureError(ouverte, placeTrack(ouverte))).toBe(
            'la boucle ne se referme pas : après la dernière tuile on arrive en (0, -1) orienté 5, ' +
                'le départ est en (0, 0) orienté 0',
        );
    });

    it('voit une tuile posée sur une autre', () => {
        expect(overlapErrors(placeTrack(recoupe))).toEqual([
            'la tuile 6 recouvre la tuile 0 en (0,0)',
        ]);
    });

    it('donne à chaque tuile posée son profil d’entrée', () => {
        const { tiles } = placeTrack(petitAnneau);
        expect(tiles[4]?.entry.roadWidth).toBe(3);
        expect(tiles[4]?.tile.profile.roadWidth).toBe(2);
    });
});
