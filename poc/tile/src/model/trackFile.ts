import type { ExitFace } from './face';
import { isExitFace } from './face';
import type { Environment } from './environment';
import { isEnvironmentId } from './environment';
import type { Barrier, Hazard, HazardSize, Obstacle, Patch, RoadBand } from './obstacle';
import type { LandscapeType, Profile, RoadType, ShoulderType, ShoulderWidth } from './profile';
import type { Tile } from './tile';
import type { Track, TrackMode } from './track';
import { TRACK_MODES } from './track';

/**
 * Le fichier de piste (spec 5.4, croquis 6) : un texte lisible à la main.
 *
 *     hexrace-track 1
 *
 *     id: europe-ring-01
 *     name: Petit Anneau
 *     environment: europe
 *     mode: track
 *     laps: 3
 *
 *     [tiles]
 *     start  exit=12  pos=2 w=3  sh=1,1  h=5  t=1/1/1
 *            exit=2   pos=2 w=3  sh=1,1  h=5  t=1/1/1  obs=hazard:small@0.5/1,barrier:left
 *
 * Une ligne par tuile, dans l'ordre de parcours ; l'entrée est toujours la face 6 et seule la sortie
 * s'écrit. `exit` face de sortie ; `pos` et `w` position et largeur de la piste en sortie ; `sh`
 * bas-côtés gauche,droite (0 ou 1, `0,0` par défaut) ; `h` hauteur ; `t` rangs piste/bas-côté/paysage
 * dans la palette de l'environnement. `obs`, optionnel, liste des obstacles séparés par des virgules :
 *
 *     hazard:<small|medium|large>@<fraction>[/<décalage>]
 *     barrier:<left|right>[@<de>-<à>]
 *     ramp@<de>-<à>   bump@<de>-<à>
 *     patch:<rang de piste>@<de>-<à>[/<décalage>[x<largeur>]]
 *
 * Le mot `start` peut ouvrir la première ligne. `#` commence un commentaire.
 */

export const FORMAT = 'hexrace-track';
export const VERSION = 1;

export interface ParseResult {
    readonly track: Track | null;
    readonly errors: string[];
}

export function parseTrack(text: string): ParseResult {
    const errors: string[] = [];
    const header = new Map<string, string>();
    const tiles: Tile[] = [];
    let formatSeen = false;
    let inTiles = false;
    let tileLines = 0;

    const lines = text.split(/\r?\n/);
    for (let index = 0; index < lines.length; index++) {
        const line = (lines[index] ?? '').replace(/#.*$/, '').trim();
        const at = `ligne ${index + 1}`;
        if (line === '') continue;
        if (!formatSeen) {
            const m = /^(\S+)\s+(\d+)$/.exec(line);
            if (m?.[1] !== FORMAT) {
                errors.push(`${at} : la première ligne doit être « ${FORMAT} ${VERSION} »`);
            } else if (Number(m[2]) !== VERSION) {
                errors.push(`${at} : version ${m[2]} inconnue, attendu ${VERSION}`);
            }
            formatSeen = true;
            continue;
        }
        if (line === '[tiles]') {
            inTiles = true;
            continue;
        }
        if (!inTiles) {
            const m = /^([a-z]+)\s*:\s*(.*)$/.exec(line);
            if (!m?.[1]) errors.push(`${at} : attendu « clé: valeur », lu « ${line} »`);
            else header.set(m[1], (m[2] ?? '').trim());
            continue;
        }
        const tile = parseTileLine(line, at, tileLines === 0, errors);
        tileLines++;
        if (tile) tiles.push(tile);
    }

    if (!formatSeen) errors.push(`fichier vide : attendu « ${FORMAT} ${VERSION} »`);
    const id = header.get('id') ?? '';
    const name = header.get('name') ?? '';
    const environment = header.get('environment') ?? '';
    const mode = header.get('mode') ?? '';
    const laps = header.get('laps');
    if (id === '') errors.push('en-tête : « id » manquant');
    if (name === '') errors.push('en-tête : « name » manquant');
    if (!isEnvironmentId(environment))
        errors.push(`en-tête : environnement « ${environment} » inconnu`);
    if (!isTrackMode(mode))
        errors.push(`en-tête : mode « ${mode} » inconnu, attendu track ou rally`);
    if (laps !== undefined && !/^\d+$/.test(laps))
        errors.push(`en-tête : « laps » doit être un entier`);
    if (!inTiles) errors.push('section [tiles] manquante');

    if (errors.length > 0 || !isEnvironmentId(environment) || !isTrackMode(mode))
        return { track: null, errors };
    return {
        track: {
            id,
            name,
            environment,
            mode,
            ...(laps !== undefined ? { laps: Number(laps) } : {}),
            tiles,
        },
        errors,
    };
}

function parseTileLine(line: string, at: string, first: boolean, errors: string[]): Tile | null {
    const tokens = line.split(/\s+/);
    if (tokens[0] === 'start') {
        if (!first) errors.push(`${at} : « start » n'est permis que sur la première tuile`);
        tokens.shift();
    }
    const fields = new Map<string, string>();
    for (const token of tokens) {
        const eq = token.indexOf('=');
        if (eq <= 0) {
            errors.push(`${at} : attendu « clé=valeur », lu « ${token} »`);
            continue;
        }
        fields.set(token.slice(0, eq), token.slice(eq + 1));
    }
    const before = errors.length;
    const exit = parseExit(fields.get('exit'), at, errors);
    const position = parseInt10(fields.get('pos'), 'pos', at, errors);
    const roadWidth = parseInt10(fields.get('w'), 'w', at, errors);
    const [leftShoulder, rightShoulder] = parseShoulders(fields.get('sh') ?? '0,0', at, errors);
    const height = parseInt10(fields.get('h'), 'h', at, errors);
    const [road, shoulder, landscape] = parseTypes(fields.get('t'), at, errors);
    const obstacles = fields.has('obs')
        ? parseObstacles(fields.get('obs') ?? '', at, errors)
        : undefined;
    for (const key of fields.keys()) {
        if (!['exit', 'pos', 'w', 'sh', 'h', 't', 'obs'].includes(key))
            errors.push(`${at} : clé « ${key} » inconnue`);
    }
    if (errors.length > before || exit === null) return null;
    const profile: Profile = {
        position,
        roadWidth,
        leftShoulder,
        rightShoulder,
        height,
        road: road as RoadType,
        shoulder: shoulder as ShoulderType,
        landscape: landscape as LandscapeType,
    };
    return { exit, profile, ...(obstacles && obstacles.length > 0 ? { obstacles } : {}) };
}

function parseExit(value: string | undefined, at: string, errors: string[]): ExitFace | null {
    const n = Number(value);
    if (value === undefined || !isExitFace(n)) {
        errors.push(`${at} : exit « ${value ?? ''} » invalide, attendu 12, 2, 4, 8 ou 10`);
        return null;
    }
    return n;
}

function parseInt10(value: string | undefined, key: string, at: string, errors: string[]): number {
    if (value === undefined || !/^-?\d+$/.test(value)) {
        errors.push(`${at} : ${key} « ${value ?? ''} » invalide, attendu un entier`);
        return 0;
    }
    return Number(value);
}

function parseShoulders(
    value: string,
    at: string,
    errors: string[],
): [ShoulderWidth, ShoulderWidth] {
    const m = /^([01]),([01])$/.exec(value);
    if (!m) {
        errors.push(`${at} : sh « ${value} » invalide, attendu gauche,droite en 0 ou 1`);
        return [0, 0];
    }
    return [Number(m[1]) as ShoulderWidth, Number(m[2]) as ShoulderWidth];
}

function parseTypes(
    value: string | undefined,
    at: string,
    errors: string[],
): [number, number, number] {
    const m = /^([123])\/([123])\/([12])$/.exec(value ?? '');
    if (!m) {
        errors.push(
            `${at} : t « ${value ?? ''} » invalide, attendu piste/bas-côté/paysage en 1-3/1-3/1-2`,
        );
        return [1, 1, 1];
    }
    return [Number(m[1]), Number(m[2]), Number(m[3])];
}

const FRACTION = String.raw`(0(?:\.\d+)?|1(?:\.0+)?)`;
const NUMBER = String.raw`(-?\d+(?:\.\d+)?)`;
const HAZARD = new RegExp(String.raw`^hazard:(small|medium|large)@${FRACTION}(?:/${NUMBER})?$`);
const BARRIER = new RegExp(String.raw`^barrier:(left|right)(?:@${FRACTION}-${FRACTION})?$`);
const BAND = new RegExp(String.raw`^(ramp|bump)@${FRACTION}-${FRACTION}$`);
const PATCH = new RegExp(
    String.raw`^patch:([123])@${FRACTION}-${FRACTION}(?:/${NUMBER}(?:x${NUMBER})?)?$`,
);

function parseObstacles(value: string, at: string, errors: string[]): Obstacle[] {
    const obstacles: Obstacle[] = [];
    for (const item of value.split(',').filter((s) => s !== '')) {
        const obstacle = parseObstacle(item);
        if (obstacle) obstacles.push(obstacle);
        else errors.push(`${at} : obstacle « ${item} » invalide`);
    }
    return obstacles;
}

export function parseObstacle(item: string): Obstacle | null {
    let m = HAZARD.exec(item);
    if (m) {
        const hazard: Hazard = {
            kind: 'hazard',
            size: m[1] as HazardSize,
            at: Number(m[2]),
            offset: Number(m[3] ?? 0),
        };
        return hazard;
    }
    m = BARRIER.exec(item);
    if (m) {
        const barrier: Barrier = {
            kind: 'barrier',
            side: m[1] as 'left' | 'right',
            from: Number(m[2] ?? 0),
            to: Number(m[3] ?? 1),
        };
        return barrier;
    }
    m = BAND.exec(item);
    if (m) {
        const band: RoadBand = {
            kind: m[1] as 'ramp' | 'bump',
            from: Number(m[2]),
            to: Number(m[3]),
        };
        return band;
    }
    m = PATCH.exec(item);
    if (m) {
        const patch: Patch = {
            kind: 'patch',
            road: Number(m[1]) as RoadType,
            from: Number(m[2]),
            to: Number(m[3]),
            offset: Number(m[4] ?? 0),
            width: Number(m[5] ?? 1),
        };
        return patch;
    }
    return null;
}

function isTrackMode(value: string): value is TrackMode {
    return (TRACK_MODES as readonly string[]).includes(value);
}

/** Écrit une piste dans le format ci-dessus ; `parseTrack(serializeTrack(t))` redonne `t`. */
export function serializeTrack(track: Track, environment?: Environment): string {
    const lines = [`${FORMAT} ${VERSION}`, '', `id: ${track.id}`, `name: ${track.name}`];
    lines.push(`environment: ${track.environment}${environment ? `  # ${environment.name}` : ''}`);
    lines.push(`mode: ${track.mode}`);
    if (track.laps !== undefined) lines.push(`laps: ${track.laps}`);
    lines.push(
        '',
        "# Une ligne par tuile, dans l'ordre de parcours. L'entrée est toujours la face 6.",
    );
    lines.push(
        '# exit face de sortie · pos/w position et largeur de la piste en sortie · sh bas-côtés gauche,droite',
    );
    lines.push('# h hauteur · t rangs piste/bas-côté/paysage · obs obstacles (voir trackFile.ts)');
    lines.push('', '[tiles]');
    track.tiles.forEach((tile, i) => {
        const p = tile.profile;
        const cells = [
            i === 0 ? 'start' : '     ',
            `exit=${String(tile.exit).padEnd(2)}`,
            `pos=${p.position}`,
            `w=${p.roadWidth}`,
            `sh=${p.leftShoulder},${p.rightShoulder}`,
            `h=${String(p.height).padEnd(2)}`,
            `t=${p.road}/${p.shoulder}/${p.landscape}`,
        ];
        if (tile.obstacles && tile.obstacles.length > 0)
            cells.push(`obs=${tile.obstacles.map(serializeObstacle).join(',')}`);
        lines.push(cells.join('  '));
    });
    return lines.join('\n') + '\n';
}

export function serializeObstacle(obstacle: Obstacle): string {
    switch (obstacle.kind) {
        case 'hazard':
            return `hazard:${obstacle.size}@${num(obstacle.at)}${obstacle.offset !== 0 ? `/${num(obstacle.offset)}` : ''}`;
        case 'barrier':
            return `barrier:${obstacle.side}${obstacle.from !== 0 || obstacle.to !== 1 ? `@${num(obstacle.from)}-${num(obstacle.to)}` : ''}`;
        case 'ramp':
        case 'bump':
            return `${obstacle.kind}@${num(obstacle.from)}-${num(obstacle.to)}`;
        case 'patch': {
            const tail =
                obstacle.offset !== 0 || obstacle.width !== 1
                    ? `/${num(obstacle.offset)}${obstacle.width !== 1 ? `x${num(obstacle.width)}` : ''}`
                    : '';
            return `patch:${obstacle.road}@${num(obstacle.from)}-${num(obstacle.to)}${tail}`;
        }
    }
}

function num(value: number): string {
    return String(Math.round(value * 1000) / 1000);
}
