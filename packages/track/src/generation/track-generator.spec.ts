import { TestBed } from '@angular/core/testing';
import { type Tile } from '@hexrace/tile';

import { type Dials, type GeneratorConfig, DEFAULT_GENERATOR } from '@track/entity/generation';
import { type Track } from '@track/entity/track';
import { ScriptedExits, provideScriptedExits } from '@track/generation/exit-choices.mock';
import { GeneratorConfigs } from '@track/generation/generator-configs';
import { TrackGenerator } from '@track/generation/track-generator';
import { TrackValidation } from '@track/geometry/track-validation';

const PRESETS: Dials[] = [
  { turning: 0, sharpness: 0, relief: 0, variety: 0, obstacles: 0 },
  { turning: 9, sharpness: 9, relief: 9, variety: 9, obstacles: 9 },
  { turning: 5, sharpness: 3, relief: 4, variety: 4, obstacles: 3 },
  { turning: 8, sharpness: 1, relief: 2, variety: 7, obstacles: 6 },
];

describe('TrackGenerator', () => {
  let generator: TrackGenerator;
  let configs: GeneratorConfigs;
  let validation: TrackValidation;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    generator = TestBed.inject(TrackGenerator);
    configs = TestBed.inject(GeneratorConfigs);
    validation = TestBed.inject(TrackValidation);
  });

  it('gives the same track for the same string, another one for another seed', () => {
    const a = generator.generate(DEFAULT_GENERATOR);
    const b = generator.generate(DEFAULT_GENERATOR);
    const c = generator.generate({ ...DEFAULT_GENERATOR, seed: 'other' });
    expect(a).toEqual(b);
    expect(a.tiles).not.toEqual(c.tiles);
    expect(a.tiles).toHaveLength(30);
    expect(a.mode).toBe('rally');
    expect(a.id).toBe('gen-europe-hexrace-t5s3r4v4o3-n30');
    expect(a.name).toBe('Seed hexrace');
  });

  it('starts straight and never ends on a hairpin', () => {
    const track = generator.generate(DEFAULT_GENERATOR);
    expect(track.tiles[0]?.exit).toBe(12);
    expect([4, 8]).not.toContain(track.tiles.at(-1)?.exit);
  });

  it('closes a loop, lays it back on its start, and gives it the Track mode', () => {
    for (const length of [8, 12, 20, 30]) {
      const track = generator.generate({ ...DEFAULT_GENERATOR, length, mode: 'track' });
      expect(track.mode).toBe('track');
      expect(track.tiles).toHaveLength(length);
      expect(validation.validate(track).issues).toEqual([]);
    }
  });

  it('falls back on a Rally line when the loop is too short to come back', () => {
    const track = generator.generate({ ...DEFAULT_GENERATOR, length: 4, mode: 'track' });
    expect(track.mode).toBe('rally');
    expect(validation.validate(track).issues).toEqual([]);
  });

  it.each(PRESETS)('makes valid tracks for many seeds with the dials %o', (dials: Dials) => {
    let obstacles = 0;
    for (let i = 0; i < 25; i++) {
      const config: GeneratorConfig = {
        environment: 'north',
        seed: `seed-${String(i)}`,
        dials,
        length: 40,
        mode: 'rally',
      };
      const track = generator.generate(config);
      expect(validation.validate(track).issues, configs.format(config)).toEqual([]);
      expect(track.tiles.length, configs.format(config)).toBe(40);
      obstacles += track.tiles.reduce(
        (n: number, tile: Tile) => n + (tile.obstacles?.length ?? 0),
        0,
      );
    }
    expect(obstacles).toBeGreaterThanOrEqual(dials.obstacles === 0 ? 0 : 20);
  });

  it('keeps the profile still in a hairpin and moves the height moderately', () => {
    for (let i = 0; i < 15; i++) {
      const track = generator.generate({
        ...DEFAULT_GENERATOR,
        seed: `s${String(i)}`,
        dials: { turning: 9, sharpness: 9, relief: 9, variety: 9, obstacles: 0 },
      });
      track.tiles.forEach((tile: Tile, index: number) => {
        if (index === 0 || (tile.exit !== 4 && tile.exit !== 8)) return;
        const entry = track.tiles[index - 1]?.profile;
        if (!entry) return;
        expect({ ...tile.profile, road: 0, shoulder: 0, height: 0 }).toEqual({
          ...entry,
          road: 0,
          shoulder: 0,
          height: 0,
        });
        expect(Math.abs(tile.profile.height - entry.height)).toBeLessThanOrEqual(11);
      });
    }
  });

  it('makes a straight line with no turning, and no hairpin with no sharpness', () => {
    const straight: Track = generator.generate({
      ...DEFAULT_GENERATOR,
      dials: { ...DEFAULT_GENERATOR.dials, turning: 0 },
    });
    expect(straight.tiles.every((tile: Tile) => tile.exit === 12)).toBe(true);
    const wide = generator.generate({
      ...DEFAULT_GENERATOR,
      dials: { ...DEFAULT_GENERATOR.dials, turning: 9, sharpness: 0 },
    });
    expect(wide.tiles.every((tile: Tile) => tile.exit !== 4 && tile.exit !== 8)).toBe(true);
  });

  it('gives up rather than looping when it cannot lay a single tile', () => {
    generator.attemptsPerTile = 0;
    expect(generator.generate({ ...DEFAULT_GENERATOR, length: 5 }).tiles).toEqual([]);
  });

  it.each([5, 8])(
    'allows longer runs of hairpins as the sharpness rises to %i',
    (sharpness: number) => {
      const track = generator.generate({
        ...DEFAULT_GENERATOR,
        seed: `sharp-${String(sharpness)}`,
        dials: { ...DEFAULT_GENERATOR.dials, turning: 9, sharpness },
        length: 20,
      });
      expect(validation.validate(track).issues).toEqual([]);
    },
  );

  it('backs out of every dead end, then gives up when the first tile has nowhere to go', () => {
    const scripted = new ScriptedExits();
    scripted.budget = 3;
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideScriptedExits(scripted)] });
    const walled = TestBed.inject(TrackGenerator);
    expect(walled.generate({ ...DEFAULT_GENERATOR, length: 10 }).tiles).toEqual([]);
  });
});
