import { describe, expect, it } from 'vitest';
import {
    EXIT_FACES,
    FACES,
    faceFromIndex,
    faceIndex,
    isExitFace,
    isFace,
    oppositeFace,
    turnKind,
    turnOf,
} from './face';

describe('faces', () => {
    it('numérote les faces dans le sens horaire à partir de 12', () => {
        expect(FACES.map(faceIndex)).toEqual([0, 1, 2, 3, 4, 5]);
        expect(FACES.map((face) => faceFromIndex(faceIndex(face)))).toEqual(FACES);
    });

    it('boucle modulo six dans les deux sens', () => {
        expect(faceFromIndex(6)).toBe(12);
        expect(faceFromIndex(7)).toBe(2);
        expect(faceFromIndex(-1)).toBe(10);
    });

    it('oppose 12 et 6, 2 et 8, 4 et 10', () => {
        expect(oppositeFace(12)).toBe(6);
        expect(oppositeFace(2)).toBe(8);
        expect(oppositeFace(10)).toBe(4);
        for (const face of FACES) expect(oppositeFace(oppositeFace(face))).toBe(face);
    });

    it('ne sort jamais par la face d’entrée', () => {
        expect(isFace(6)).toBe(true);
        expect(isExitFace(6)).toBe(false);
        expect(isFace(7)).toBe(false);
        for (const face of EXIT_FACES) expect(isExitFace(face)).toBe(true);
    });

    it('lit le virage dans la face de sortie, positif à droite', () => {
        expect(turnOf(12)).toBe(0);
        expect(turnOf(2)).toBe(1);
        expect(turnOf(4)).toBe(2);
        expect(turnOf(10)).toBe(-1);
        expect(turnOf(8)).toBe(-2);
        expect(turnKind(12)).toBe('straight');
        expect(turnKind(10)).toBe('wide');
        expect(turnKind(4)).toBe('sharp');
    });
});
