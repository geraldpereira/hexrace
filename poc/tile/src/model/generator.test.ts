import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, formatConfig, generateTrack, parseConfig } from './generator';
import type { GeneratorConfig } from './generator';
import { createRng } from './rng';
import { validateTrack } from './validation';

describe('générateur pseudo-aléatoire', () => {
    it('est déterministe et couvre [0, 1)', () => {
        const a = createRng('hexrace');
        const b = createRng('hexrace');
        const c = createRng('hexrace2');
        const sa = Array.from({ length: 5 }, () => a.next());
        const sb = Array.from({ length: 5 }, () => b.next());
        const sc = Array.from({ length: 5 }, () => c.next());
        expect(sa).toEqual(sb);
        expect(sa).not.toEqual(sc);
        for (let i = 0; i < 1000; i++) {
            const v = a.next();
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThan(1);
        }
    });
});

describe('générateur de pistes', () => {
    it('écrit et relit la chaîne de configuration', () => {
        const text = formatConfig(DEFAULT_CONFIG);
        expect(text).toBe('europe:hexrace:t5s3r4v4o3:n30');
        expect(parseConfig(text)).toEqual(DEFAULT_CONFIG);
        expect(parseConfig('mars:x:t1s1r1v1o1:n10')).toBeNull();
        expect(parseConfig('europe:x:t1s1r1v1:n10')).toBeNull();
    });

    it('donne la même piste pour la même chaîne, une autre pour une autre graine', () => {
        const a = generateTrack(DEFAULT_CONFIG);
        const b = generateTrack(DEFAULT_CONFIG);
        const c = generateTrack({ ...DEFAULT_CONFIG, seed: 'autre' });
        expect(a).toEqual(b);
        expect(a.tiles).not.toEqual(c.tiles);
        expect(a.tiles).toHaveLength(30);
        expect(a.tiles[0]?.exit).toBe(12);
    });

    it('produit une piste valide pour un grand nombre de graines et de cadrans', () => {
        const presets: GeneratorConfig['dials'][] = [
            { turning: 0, sharpness: 0, relief: 0, variety: 0, obstacles: 0 },
            { turning: 9, sharpness: 9, relief: 9, variety: 9, obstacles: 9 },
            { turning: 5, sharpness: 3, relief: 4, variety: 4, obstacles: 3 },
            { turning: 8, sharpness: 1, relief: 2, variety: 7, obstacles: 6 },
        ];
        let tiles = 0;
        let obstacles = 0;
        for (const dials of presets) {
            for (let i = 0; i < 60; i++) {
                const config: GeneratorConfig = {
                    environment: 'north',
                    seed: `graine-${i}`,
                    dials,
                    length: 40,
                };
                const track = generateTrack(config);
                const { issues } = validateTrack(track);
                expect(issues, formatConfig(config)).toEqual([]);
                expect(track.tiles.length, formatConfig(config)).toBe(40);
                tiles += track.tiles.length;
                obstacles += track.tiles.reduce((n, t) => n + (t.obstacles?.length ?? 0), 0);
            }
        }
        expect(tiles).toBe(4 * 60 * 40);
        expect(obstacles).toBeGreaterThan(200);
    });

    it('garde le profil constant dans les épingles et n’y change la hauteur que modérément', () => {
        for (let i = 0; i < 40; i++) {
            const track = generateTrack({
                ...DEFAULT_CONFIG,
                seed: `s${i}`,
                dials: { turning: 9, sharpness: 9, relief: 9, variety: 9, obstacles: 0 },
            });
            track.tiles.forEach((tile, index) => {
                if (index === 0 || (tile.exit !== 4 && tile.exit !== 8)) return;
                const entry = track.tiles[index - 1]?.profile;
                expect(entry).toBeDefined();
                if (!entry) return;
                expect({ ...tile.profile, road: 0, height: 0 }).toEqual({
                    ...entry,
                    road: 0,
                    height: 0,
                });
                expect(Math.abs(tile.profile.height - entry.height)).toBeLessThanOrEqual(3);
            });
        }
    });

    it('sans virage fait une ligne droite, tout tournant en enchaîne peu de serrés', () => {
        const straight = generateTrack({
            ...DEFAULT_CONFIG,
            dials: { ...DEFAULT_CONFIG.dials, turning: 0 },
        });
        expect(straight.tiles.every((t) => t.exit === 12)).toBe(true);
        const sharp = generateTrack({
            ...DEFAULT_CONFIG,
            dials: { ...DEFAULT_CONFIG.dials, turning: 9, sharpness: 0 },
        });
        expect(sharp.tiles.every((t) => t.exit !== 4 && t.exit !== 8)).toBe(true);
    });
});
