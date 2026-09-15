import { Injectable, inject } from '@angular/core';
import { Random, type Rng } from '@hexrace/commons';
import {
  type Cell,
  type ExitFace,
  type Pose,
  type Profile,
  type Tile,
  type TileSweep,
  EnvironmentCatalog,
  Faces,
  Grid,
  Layout,
} from '@hexrace/tile';

import { type Dials, type GeneratorConfig } from '@track/entity/generation';
import { ORIGIN } from '@track/entity/placement';
import { type Track } from '@track/entity/track';
import { ExitChoices } from '@track/generation/exit-choices';
import { GeneratorConfigs } from '@track/generation/generator-configs';
import { LoopClosing } from '@track/generation/loop-closing';
import { ObstacleSeeder } from '@track/generation/obstacle-seeder';
import { type HeightRange, ProfileSteps } from '@track/generation/profile-steps';

const TIGHT_SLACK = 18;

interface Landing {
  readonly exit: ExitFace;
  readonly cell: Cell;
  readonly slack: number;
}

interface Step {
  readonly tile: Tile;
  readonly pose: Pose;
  readonly profile: Profile;
  readonly trend: number;
  readonly sharpRun: number;
  readonly candidates: ExitFace[];
}

interface Run {
  readonly config: GeneratorConfig;
  readonly loop: boolean;
  readonly home: Profile;
  readonly dials: Dials;
  readonly rng: Rng;
  readonly maxSharpRun: number;
  readonly occupied: Set<string>;
  readonly range: HeightRange;
  readonly steps: Step[];
  pose: Pose;
  profile: Profile;
  trend: number;
  sharpRun: number;
  candidates: ExitFace[];
  budget: number;
}

/**
 * The track generator (functional spec 5.3): one tile after another from the previous one, every
 * parameter drawn from the seed, joining true by construction and the grid test of 5.5 held by a
 * bounded backtracking. The first tile is straight, so a generated track always passes the
 * validation. A Rally line goes where it likes; a Track loop is steered home by `LoopClosing`
 * and falls back to Rally when the backtracking cannot close it inside its budget.
 */
@Injectable({ providedIn: 'root' })
export class TrackGenerator {
  /** How many attempts per tile before giving up on a track that will not grow. */
  attemptsPerTile = 500;
  /** A loop searches against a whole budget, not one per tile: a long one is hard however long. */
  loopBudget = 12_000;

  private readonly configs = inject(GeneratorConfigs);
  private readonly environments = inject(EnvironmentCatalog);
  private readonly exits = inject(ExitChoices);
  private readonly faces = inject(Faces);
  private readonly grid = inject(Grid);
  private readonly layout = inject(Layout);
  private readonly loops = inject(LoopClosing);
  private readonly profiles = inject(ProfileSteps);
  private readonly random = inject(Random);
  private readonly seeder = inject(ObstacleSeeder);

  /** A track of `length` tiles, or fewer when the grid blocks despite backtracking, which is rare. */
  generate(config: GeneratorConfig): Track {
    const loop = config.mode === 'track' ? this.walk(config) : null;
    if (loop && this.closed(loop)) return this.trackOf(config, loop.steps, true);
    return this.trackOf(config, this.walk({ ...config, mode: 'rally' }).steps, false);
  }

  private walk(config: GeneratorConfig): Run {
    const run = this.begin(config);
    while (run.steps.length < config.length && run.budget-- > 0) {
      const exit = run.candidates.shift();
      if (exit === undefined) {
        if (!this.backtrack(run)) break;
      } else this.push(run, exit);
    }
    return run;
  }

  private closed(run: Run): boolean {
    if (run.steps.length < run.config.length) return false;
    return this.grid.samePose(run.pose, ORIGIN);
  }

  private begin(config: GeneratorConfig): Run {
    const dials = this.configs.normalize(config.dials);
    const rng = this.random.seeded(this.configs.format(config));
    const profile = this.profiles.start(rng);
    const run: Run = {
      config,
      loop: config.mode === 'track',
      home: profile,
      dials,
      rng,
      maxSharpRun: this.sharpRunLimit(dials.sharpness),
      occupied: new Set<string>([this.grid.key(ORIGIN.cell)]),
      range: { min: profile.height, max: profile.height },
      steps: [],
      pose: ORIGIN,
      profile,
      trend: 0,
      sharpRun: 0,
      candidates: [],
      budget:
        config.mode === 'track' ? this.loopBudget : config.length * this.attemptsPerTile,
    };
    run.candidates = this.choices(run);
    return run;
  }

  private sharpRunLimit(sharpness: number): number {
    if (sharpness < 0.34) return 1;
    return sharpness < 0.67 ? 2 : 3;
  }

  private push(run: Run, exit: ExitFace): void {
    const first = run.steps.length === 0;
    const last = run.steps.length === run.config.length - 1;
    const profile = this.profileOf(run, exit, first, last);
    const climb = first ? run.trend : profile.height - run.profile.height;
    const sweep: TileSweep = {
      center: this.layout.cellToWorld(run.pose.cell),
      heading: run.pose.heading,
      exit,
      entry: run.profile,
      exitProfile: profile,
      transition: this.environments.of(run.config.environment).transition,
    };
    const obstacles = first || last ? [] : this.seeder.make(run.rng, run.dials, sweep);
    run.steps.push({
      tile: { exit, profile, ...(obstacles.length > 0 ? { obstacles } : {}) },
      pose: run.pose,
      profile: run.profile,
      trend: run.trend,
      sharpRun: run.sharpRun,
      candidates: run.candidates,
    });
    const heading = this.grid.exitHeading(run.pose.heading, exit);
    run.pose = { cell: this.grid.neighbor(run.pose.cell, heading), heading };
    run.occupied.add(this.grid.key(run.pose.cell));
    run.profile = profile;
    run.range.min = Math.min(run.range.min, profile.height);
    run.range.max = Math.max(run.range.max, profile.height);
    run.trend = climb === 0 ? run.trend : Math.sign(climb);
    run.sharpRun = Math.abs(this.faces.turnOf(exit)) === 2 ? run.sharpRun + 1 : 0;
    run.candidates = this.choices(run);
  }

  private profileOf(run: Run, exit: ExitFace, first: boolean, last: boolean): Profile {
    if (first) return run.profile;
    if (last && run.loop) return run.home;
    return this.profiles.next({
      rng: run.rng,
      dials: run.dials,
      entry: run.profile,
      exit,
      trend: run.trend,
      range: run.range,
      ...(run.loop
        ? { home: { height: run.home.height, remaining: run.config.length - run.steps.length } }
        : {}),
    });
  }

  private backtrack(run: Run): boolean {
    const last = run.steps.pop();
    if (!last) return false;
    const heading = this.grid.exitHeading(last.pose.heading, last.tile.exit);
    run.occupied.delete(this.grid.key(this.grid.neighbor(last.pose.cell, heading)));
    run.pose = last.pose;
    run.profile = last.profile;
    run.trend = last.trend;
    run.sharpRun = last.sharpRun;
    run.candidates = last.candidates;
    return true;
  }

  private choices(run: Run): ExitFace[] {
    const remaining = run.config.length - run.steps.length;
    if (run.loop && remaining === 1) return this.loops.closingExits(run.pose);
    const ranked = this.exits.ranked({
      rng: run.rng,
      dials: run.dials,
      pose: run.pose,
      occupied: run.occupied,
      sharpRun: run.sharpRun,
      maxSharpRun: run.maxSharpRun,
      straightOnly: run.steps.length === 0,
      noSharp: !run.loop && remaining === 1,
    });
    return run.loop ? this.steered(run, ranked, remaining) : ranked;
  }

  private steered(run: Run, ranked: readonly ExitFace[], remaining: number): ExitFace[] {
    const open = ranked
      .map((exit: ExitFace) => this.landingOf(run, exit, remaining))
      .filter((one: Landing) => one.slack >= 0);
    if (open.some((one: Landing) => one.slack > TIGHT_SLACK)) {
      return open.map((one: Landing) => one.exit);
    }
    return open
      .filter((one: Landing) => this.loops.canReach(one.cell, run.occupied, remaining))
      .sort((a: Landing, b: Landing) => a.slack - b.slack)
      .map((one: Landing) => one.exit);
  }

  private landingOf(run: Run, exit: ExitFace, remaining: number): Landing {
    const cell = this.grid.neighbor(run.pose.cell, this.grid.exitHeading(run.pose.heading, exit));
    return { exit, cell, slack: this.loops.slack(cell, remaining) };
  }

  private trackOf(config: GeneratorConfig, steps: readonly Step[], closed: boolean): Track {
    const text = this.configs.format(config);
    return {
      id: `gen-${text.replace(/[^A-Za-z0-9]+/g, '-')}`,
      name: `Seed ${config.seed}`,
      environment: config.environment,
      mode: closed ? 'track' : 'rally',
      tiles: steps.map((step: Step) => step.tile),
    };
  }
}
