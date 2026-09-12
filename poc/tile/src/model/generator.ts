import type { EnvironmentId } from './environment';
import { isEnvironmentId } from './environment';
import type { ExitFace } from './face';
import { EXIT_FACES, turnOf } from './face';
import { cellToWorld } from './layout';
import type { Obstacle } from './obstacle';
import { obstacleErrors } from './obstacle';
import type { Pose } from './placement';
import { ORIGIN, cellKey, exitHeading, neighbor } from './placement';
import type { Profile, RoadType, ShoulderType } from './profile';
import {
    MAX_BLOCK_WIDTH,
    MAX_HEIGHT,
    MAX_ROAD_WIDTH,
    MIN_HEIGHT,
    MIN_ROAD_WIDTH,
    FACE_WIDTH,
    MIN_LANDSCAPE_WIDTH,
} from './profile';
import type { Rng } from './rng';
import { createRng } from './rng';
import type { TileSweep } from './sweep';
import { GENERATOR_SLOPE_FACTOR, maxHeightSteps } from './slope';
import { MAX_AMPLITUDE_STEPS } from './units';
import type { Tile } from './tile';
import type { Track } from './track';

/**
 * Le générateur de pistes (spec 5.3) : une graine et cinq cadrans dans une seule chaîne, une tuile
 * après l'autre à partir de la précédente, dans le respect de 2.6 (par construction) et de 5.5 (test
 * d'occupation de la grille avec retour arrière). La même chaîne donne toujours la même piste.
 *
 *     europe:hexrace:t5s3r4v4o3:n30
 *
 * environnement, graine, cadrans de 0 à 9 (t tournant, s serré, r relief, v variété de profil,
 * o obstacles), puis le nombre de tuiles. Le générateur ne fait que des pistes ouvertes (Rally,
 * c'est le mode Collapse de la spec).
 */

export interface Dials {
    /** Part des tuiles qui tournent. */
    readonly turning: number;
    /** Part des virages qui sont serrés, et combien on en enchaîne au plus. */
    readonly sharpness: number;
    /** Fréquence des changements de hauteur. */
    readonly relief: number;
    /** Fréquence des changements de largeur, de position et de types. */
    readonly variety: number;
    /** Densité d'obstacles. */
    readonly obstacles: number;
}

export interface GeneratorConfig {
    readonly environment: EnvironmentId;
    readonly seed: string;
    readonly dials: Dials;
    readonly length: number;
}

export const DEFAULT_CONFIG: GeneratorConfig = {
    environment: 'europe',
    seed: 'hexrace',
    dials: { turning: 5, sharpness: 3, relief: 4, variety: 4, obstacles: 3 },
    length: 30,
};

const PATTERN = /^([a-z]+):([A-Za-z0-9_-]+):t(\d)s(\d)r(\d)v(\d)o(\d):n(\d+)$/;

export function formatConfig(config: GeneratorConfig): string {
    const d = config.dials;
    return `${config.environment}:${config.seed}:t${d.turning}s${d.sharpness}r${d.relief}v${d.variety}o${d.obstacles}:n${config.length}`;
}

export function parseConfig(text: string): GeneratorConfig | null {
    const m = PATTERN.exec(text.trim());
    if (!m) return null;
    const [, environment, seed, t, s, r, v, o, n] = m;
    if (!environment || !seed || !isEnvironmentId(environment)) return null;
    const length = Number(n);
    if (length < 1 || length > 500) return null;
    return {
        environment,
        seed,
        dials: {
            turning: Number(t),
            sharpness: Number(s),
            relief: Number(r),
            variety: Number(v),
            obstacles: Number(o),
        },
        length,
    };
}

/** Une piste ouverte de `length` tuiles ; moins si la grille bloque malgré le retour arrière (rare). */
export function generateTrack(config: GeneratorConfig): Track {
    const rng = createRng(formatConfig(config));
    const dials = normalize(config.dials);
    const maxSharpRun = dials.sharpness < 0.34 ? 1 : dials.sharpness < 0.67 ? 2 : 3;
    const start = startProfile(rng);

    interface Step {
        readonly tile: Tile;
        readonly pose: Pose;
        readonly profile: Profile;
        readonly trend: number;
        readonly sharpRun: number;
        readonly candidates: ExitFace[];
    }
    const steps: Step[] = [];
    const occupied = new Set<string>([cellKey(ORIGIN.cell)]);
    let pose: Pose = ORIGIN;
    let profile = start;
    let trend = 0;
    let sharpRun = 0;
    const range = { min: start.height, max: start.height };
    let candidates = rankedExits(rng, dials, pose, occupied, sharpRun, maxSharpRun, true);
    // Retour arrière borné : assez pour sortir d'une spirale, fini pour ne jamais boucler.
    let budget = config.length * 500;

    while (steps.length < config.length && budget-- > 0) {
        const exit = candidates.shift();
        if (exit === undefined) {
            // Impasse : on retire la dernière tuile et on essaie sa candidate suivante.
            const last = steps.pop();
            if (!last) break;
            occupied.delete(
                cellKey(neighbor(last.pose.cell, exitHeading(last.pose.heading, last.tile.exit))),
            );
            pose = last.pose;
            profile = last.profile;
            trend = last.trend;
            sharpRun = last.sharpRun;
            candidates = last.candidates;
            continue;
        }
        const isFirst = steps.length === 0;
        const nextProfile = isFirst
            ? profile
            : nextProfileFrom(rng, dials, profile, exit, trend, range);
        const nextTrend = isFirst ? trend : nextProfile.height - profile.height;
        const sweep: TileSweep = {
            center: cellToWorld(pose.cell),
            heading: pose.heading,
            exit,
            entry: profile,
            exitProfile: nextProfile,
        };
        const obstacles = isFirst ? [] : makeObstacles(rng, dials, sweep);
        const tile: Tile = {
            exit,
            profile: nextProfile,
            ...(obstacles.length > 0 ? { obstacles } : {}),
        };
        steps.push({ tile, pose, profile, trend, sharpRun, candidates });

        const heading = exitHeading(pose.heading, exit);
        pose = { cell: neighbor(pose.cell, heading), heading };
        occupied.add(cellKey(pose.cell));
        profile = nextProfile;
        range.min = Math.min(range.min, nextProfile.height);
        range.max = Math.max(range.max, nextProfile.height);
        trend = nextTrend === 0 ? trend : Math.sign(nextTrend);
        sharpRun = Math.abs(turnOf(exit)) === 2 ? sharpRun + 1 : 0;
        candidates = rankedExits(rng, dials, pose, occupied, sharpRun, maxSharpRun, false);
    }

    return {
        id: `gen-${formatConfig(config).replace(/[^A-Za-z0-9]+/g, '-')}`,
        name: `Graine ${config.seed}`,
        environment: config.environment,
        mode: 'rally',
        tiles: steps.map((s) => s.tile),
    };
}

function normalize(dials: Dials): Dials {
    const n = (v: number): number => Math.min(9, Math.max(0, v)) / 9;
    return {
        turning: n(dials.turning),
        sharpness: n(dials.sharpness),
        relief: n(dials.relief),
        variety: n(dials.variety),
        obstacles: n(dials.obstacles),
    };
}

/**
 * Les sorties possibles depuis une pose, dans un ordre tiré au sort selon les cadrans, en écartant
 * celles qui mènent sur une case occupée ou dans une case d'où toutes les sorties sont bouchées.
 */
function rankedExits(
    rng: Rng,
    dials: Dials,
    pose: Pose,
    occupied: Set<string>,
    sharpRun: number,
    maxSharpRun: number,
    first: boolean,
): ExitFace[] {
    const weight = (exit: ExitFace): number => {
        const turn = Math.abs(turnOf(exit));
        if (first && turn !== 0) return 0;
        if (turn === 0) return 1 - dials.turning + 0.05;
        if (turn === 1)
            return dials.turning === 0 ? 0 : (dials.turning * (1 - dials.sharpness)) / 2 + 0.02;
        return sharpRun >= maxSharpRun ? 0 : (dials.turning * dials.sharpness) / 2;
    };
    const free = EXIT_FACES.filter((exit) => {
        const heading = exitHeading(pose.heading, exit);
        const cell = neighbor(pose.cell, heading);
        if (occupied.has(cellKey(cell))) return false;
        // Anticipation d'un pas : au moins une sortie libre depuis la case suivante.
        return EXIT_FACES.some(
            (next) => !occupied.has(cellKey(neighbor(cell, exitHeading(heading, next)))),
        );
    });
    const ranked: ExitFace[] = [];
    const pool = [...free];
    while (pool.length > 0) {
        const chosen = rng.weighted(pool, weight) ?? pool[0];
        if (chosen === undefined) break;
        ranked.push(chosen);
        pool.splice(pool.indexOf(chosen), 1);
    }
    return ranked;
}

function startProfile(rng: Rng): Profile {
    const roadWidth = 2 + rng.int(2);
    return {
        position: Math.floor((FACE_WIDTH - roadWidth) / 2),
        roadWidth,
        leftShoulder: 1,
        rightShoulder: 1,
        // N'importe quelle altitude (spec 2.3) : entre 40 et 80 m.
        height: 200 + rng.int(200),
        road: 1,
        shoulder: 1,
        landscape: 1,
    };
}

/**
 * Le profil de sortie à partir du profil d'entrée : petits pas de largeur, de position et de types,
 * hauteur par une déclivité bornée à la moitié du seuil de la sortie (spec 2.3), qui suit la tendance
 * en cours pour faire des montées régulières, et reste dans l'amplitude de la piste. En épingle,
 * seuls les types et la hauteur changent : un décalage sur un arc de rayon 4 vrille la piste.
 */
function nextProfileFrom(
    rng: Rng,
    dials: Dials,
    entry: Profile,
    exit: ExitFace,
    trend: number,
    range: { min: number; max: number },
): Profile {
    const sharp = Math.abs(turnOf(exit)) === 2;
    let { roadWidth, position, leftShoulder, rightShoulder, road, shoulder } = entry;
    const { landscape } = entry;
    if (!sharp) {
        if (rng.chance(dials.variety * 0.35)) {
            roadWidth = clamp(
                roadWidth + (rng.chance(0.5) ? 1 : -1),
                MIN_ROAD_WIDTH,
                MAX_ROAD_WIDTH,
            );
        }
        if (rng.chance(dials.variety * 0.15)) leftShoulder = leftShoulder === 1 ? 0 : 1;
        if (rng.chance(dials.variety * 0.15)) rightShoulder = rightShoulder === 1 ? 0 : 1;
        // Piste plus bas-côtés au plus six unités.
        while (roadWidth + leftShoulder + rightShoulder > MAX_BLOCK_WIDTH) {
            if (leftShoulder === 1) leftShoulder = 0;
            else if (rightShoulder === 1) rightShoulder = 0;
            else roadWidth--;
        }
        // Décalage d'une unité au plus par tuile, deux en ligne droite.
        const maxShift = turnOf(exit) === 0 ? 2 : 1;
        if (rng.chance(dials.variety * 0.5)) position += rng.int(2 * maxShift + 1) - maxShift;
        const minPosition = MIN_LANDSCAPE_WIDTH + leftShoulder;
        const maxPosition = FACE_WIDTH - MIN_LANDSCAPE_WIDTH - rightShoulder - roadWidth;
        position = clamp(position, minPosition, maxPosition);
        if (rng.chance(dials.variety * 0.1)) shoulder = (1 + rng.int(3)) as ShoulderType;
    }
    if (rng.chance(dials.variety * 0.2)) road = (1 + rng.int(3)) as RoadType;

    let height = entry.height;
    if (rng.chance(dials.relief * 0.55)) {
        const limit = maxHeightSteps(exit, GENERATOR_SLOPE_FACTOR);
        const magnitude = Math.min(
            limit,
            1 + rng.int(Math.max(1, Math.round(limit * dials.relief))),
        );
        const direction = trend !== 0 && rng.chance(0.7) ? trend : rng.chance(0.5) ? 1 : -1;
        const candidate = clamp(height + direction * magnitude, MIN_HEIGHT, MAX_HEIGHT);
        const amplitude = Math.max(range.max, candidate) - Math.min(range.min, candidate);
        if (amplitude <= MAX_AMPLITUDE_STEPS) height = candidate;
    }
    return { position, roadWidth, leftShoulder, rightShoulder, height, road, shoulder, landscape };
}

/** Des obstacles selon la densité, chacun vérifié dans sa tuile ; ceux qui débordent sont écartés. */
function makeObstacles(rng: Rng, dials: Dials, sweep: TileSweep): Obstacle[] {
    const obstacles: Obstacle[] = [];
    if (!rng.chance(dials.obstacles * 0.6)) return obstacles;
    const turn = turnOf(sweep.exit);
    const candidates: Obstacle[] = [];
    const roll = rng.next();
    if (roll < 0.35) {
        const size = rng.pick(['small', 'medium', 'large'] as const) ?? 'small';
        const half = sweep.exitProfile.roadWidth / 2 + sweep.exitProfile.rightShoulder;
        candidates.push({
            kind: 'hazard',
            size,
            at: 0.3 + rng.next() * 0.4,
            offset: Math.round((rng.next() * 2 - 1) * half * 2) / 2,
        });
    } else if (roll < 0.6) {
        // Barrière à l'extérieur du virage, ou d'un côté au hasard en ligne droite.
        const side = turn > 0 ? 'left' : turn < 0 ? 'right' : rng.chance(0.5) ? 'left' : 'right';
        candidates.push({ kind: 'barrier', side, from: 0, to: 1 });
    } else if (roll < 0.7 && turn === 0) {
        candidates.push({ kind: 'ramp', from: 0.4, to: 0.55 });
    } else if (roll < 0.82) {
        candidates.push({ kind: 'bump', from: 0.45, to: 0.55 });
    } else {
        const road = ((sweep.exitProfile.road % 3) + 1) as RoadType;
        const width = Math.min(sweep.exitProfile.roadWidth, 1 + rng.int(2));
        candidates.push({ kind: 'patch', road, from: 0.3, to: 0.7, offset: 0, width });
    }
    for (const candidate of candidates) {
        if (obstacleErrors(sweep, candidate).length === 0) obstacles.push(candidate);
    }
    return obstacles;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}
