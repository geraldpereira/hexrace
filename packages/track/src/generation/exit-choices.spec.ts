import { TestBed } from '@angular/core/testing';
import { Random, type Rng } from '@hexrace/commons';
import { type ExitFace, Grid } from '@hexrace/tile';

import { type Dials } from '@track/entity/generation';
import { ORIGIN } from '@track/entity/placement';
import { type ExitQuery, ExitChoices } from '@track/generation/exit-choices';
import { SilentRng } from '@track/generation/rng.mock';

const TURNING: Dials = { turning: 1, sharpness: 0.5, relief: 0, variety: 0, obstacles: 0 };

describe('ExitChoices', () => {
  let choices: ExitChoices;
  let grid: Grid;
  let rng: Rng;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    choices = TestBed.inject(ExitChoices);
    grid = TestBed.inject(Grid);
    rng = TestBed.inject(Random).seeded('exits');
  });

  function query(changes: Partial<ExitQuery> = {}): ExitQuery {
    return {
      rng,
      dials: TURNING,
      pose: ORIGIN,
      occupied: new Set<string>([grid.key(ORIGIN.cell)]),
      sharpRun: 0,
      maxSharpRun: 2,
      straightOnly: false,
      noSharp: false,
      ...changes,
    };
  }

  it('offers every exit when nothing is in the way', () => {
    expect(choices.ranked(query()).sort((a: number, b: number) => a - b)).toEqual([
      2, 4, 8, 10, 12,
    ]);
  });

  it('offers the straight one only when asked', () => {
    expect(choices.ranked(query({ straightOnly: true }))).toEqual([12]);
  });

  it('leaves the hairpins out at the end and once too many have followed', () => {
    expect(choices.ranked(query({ noSharp: true })).sort((a: number, b: number) => a - b)).toEqual([
      2, 10, 12,
    ]);
    expect(choices.ranked(query({ sharpRun: 2 })).sort((a: number, b: number) => a - b)).toEqual([
      2, 10, 12,
    ]);
  });

  it('keeps the straight one alone when nothing turns', () => {
    const still: Dials = { ...TURNING, turning: 0 };
    expect(choices.ranked(query({ dials: still }))).toEqual([12]);
  });

  it('drops the exits that lead onto a taken cell', () => {
    const occupied = new Set<string>([grid.key(ORIGIN.cell)]);
    for (const exit of [12, 2, 4] as ExitFace[]) {
      const heading = grid.exitHeading(ORIGIN.heading, exit);
      occupied.add(grid.key(grid.neighbor(ORIGIN.cell, heading)));
    }
    expect(choices.ranked(query({ occupied })).sort((a: number, b: number) => a - b)).toEqual([
      8, 10,
    ]);
  });

  it('stops ranking when the draw brings nothing back', () => {
    expect(choices.ranked(query({ rng: new SilentRng() }))).toEqual([]);
  });

  it('gives nothing when every neighbouring cell is walled in', () => {
    const occupied = new Set<string>([grid.key(ORIGIN.cell)]);
    for (let q = -3; q <= 3; q++) for (let r = -3; r <= 3; r++) occupied.add(grid.key({ q, r }));
    expect(choices.ranked(query({ occupied }))).toEqual([]);
  });
});
