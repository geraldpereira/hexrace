import { Injectable, inject } from '@angular/core';
import {
  type ExitFace,
  type LandscapeType,
  type Obstacle,
  type Profile,
  type RoadType,
  type ShoulderType,
  type ShoulderWidth,
  type Tile,
  Faces,
} from '@hexrace/tile';

import { type TrackFileError } from '@track/entity/file-error';
import { ObstacleText } from '@track/format/obstacle-text';

const KEYS: readonly string[] = ['exit', 'pos', 'w', 'sh', 'h', 't', 'obs'];

/** A tile line read: the tile, or null when the line held at least one problem. */
export interface TileTextParse {
  readonly tile: Tile | null;
  readonly errors: readonly TrackFileError[];
}

/**
 * One line of the `[tiles]` section (technical spec 3.3): `exit` the exit face, `pos` and `w` the
 * road position and width at the exit, `sh` the shoulders, `h` the height in steps, `t` the ranks
 * in the palette, `obs` the obstacles. Only `sh` and `obs` may be left out. Every problem comes
 * back with the line it sits on; the writer lines the columns up.
 */
@Injectable({ providedIn: 'root' })
export class TileText {
  private readonly faces = inject(Faces);
  private readonly obstacles = inject(ObstacleText);

  parse(text: string, line: number, first: boolean): TileTextParse {
    const errors: TrackFileError[] = [];
    const tokens = text.split(/\s+/);
    if (tokens[0] === 'start') {
      if (!first) errors.push({ line, message: '"start" is only allowed on the first tile' });
      tokens.shift();
    }
    const fields = this.fields(tokens, line, errors);
    const exit = this.exit(fields.get('exit'), line, errors);
    const profile = this.profile(fields, line, errors);
    const written = fields.get('obs');
    const obstacles = written === undefined ? undefined : this.obstacleList(written, line, errors);
    for (const key of fields.keys()) {
      if (!KEYS.includes(key)) errors.push({ line, message: `unknown key "${key}"` });
    }
    if (errors.length > 0 || exit === null) return { tile: null, errors };
    return {
      tile: { exit, profile, ...(obstacles && obstacles.length > 0 ? { obstacles } : {}) },
      errors,
    };
  }

  serialize(tile: Tile, first: boolean): string {
    const p = tile.profile;
    const cells = [
      first ? 'start' : '     ',
      `exit=${String(tile.exit).padEnd(2)}`,
      `pos=${String(p.position)}`,
      `w=${String(p.roadWidth)}`,
      `sh=${String(p.leftShoulder)},${String(p.rightShoulder)}`,
      `h=${String(p.height).padEnd(2)}`,
      `t=${String(p.road)}/${String(p.shoulder)}/${String(p.landscape)}`,
    ];
    if (tile.obstacles && tile.obstacles.length > 0) {
      cells.push(
        `obs=${tile.obstacles.map((o: Obstacle) => this.obstacles.serialize(o)).join(',')}`,
      );
    }
    return cells.join('  ');
  }

  private fields(tokens: string[], line: number, errors: TrackFileError[]): Map<string, string> {
    const fields = new Map<string, string>();
    for (const token of tokens) {
      const equals = token.indexOf('=');
      if (equals <= 0) errors.push({ line, message: `expected "key=value", read "${token}"` });
      else fields.set(token.slice(0, equals), token.slice(equals + 1));
    }
    return fields;
  }

  private profile(fields: Map<string, string>, line: number, errors: TrackFileError[]): Profile {
    const [leftShoulder, rightShoulder] = this.shoulders(fields.get('sh') ?? '0,0', line, errors);
    const [road, shoulder, landscape] = this.types(fields.get('t'), line, errors);
    return {
      position: this.whole(fields.get('pos'), 'pos', line, errors),
      roadWidth: this.whole(fields.get('w'), 'w', line, errors),
      leftShoulder,
      rightShoulder,
      height: this.whole(fields.get('h'), 'h', line, errors),
      road,
      shoulder,
      landscape,
    };
  }

  private exit(value: string | undefined, line: number, errors: TrackFileError[]): ExitFace | null {
    const face = Number(value);
    if (value === undefined || !this.faces.isExit(face)) {
      errors.push({
        line,
        message: `exit "${value ?? ''}" is invalid, expected 12, 2, 4, 8 or 10`,
      });
      return null;
    }
    return face;
  }

  private whole(
    value: string | undefined,
    key: string,
    line: number,
    errors: TrackFileError[],
  ): number {
    if (value === undefined || !/^-?\d+$/.test(value)) {
      errors.push({ line, message: `${key} "${value ?? ''}" is invalid, expected a whole number` });
      return 0;
    }
    return Number(value);
  }

  private shoulders(
    value: string,
    line: number,
    errors: TrackFileError[],
  ): [ShoulderWidth, ShoulderWidth] {
    const m = /^([01]),([01])$/.exec(value);
    if (!m) {
      errors.push({
        line,
        message: `sh "${value}" is invalid, expected left,right as 0 or 1`,
      });
      return [0, 0];
    }
    return [Number(m[1]) as ShoulderWidth, Number(m[2]) as ShoulderWidth];
  }

  private types(
    value: string | undefined,
    line: number,
    errors: TrackFileError[],
  ): [RoadType, ShoulderType, LandscapeType] {
    const m = /^([123])\/([123])\/([12])$/.exec(value ?? '');
    if (!m) {
      errors.push({
        line,
        message: `t "${value ?? ''}" is invalid, expected road/shoulder/landscape as 1-3/1-3/1-2`,
      });
      return [1, 1, 1];
    }
    return [Number(m[1]) as RoadType, Number(m[2]) as ShoulderType, Number(m[3]) as LandscapeType];
  }

  private obstacleList(value: string, line: number, errors: TrackFileError[]): Obstacle[] {
    const obstacles: Obstacle[] = [];
    for (const item of value.split(',').filter((piece: string) => piece !== '')) {
      const obstacle = this.obstacles.parse(item);
      if (obstacle) obstacles.push(obstacle);
      else errors.push({ line, message: `obstacle "${item}" is invalid` });
    }
    return obstacles;
  }
}
