import { Injectable, inject } from '@angular/core';
import { type EnvironmentId, type Tile, EnvironmentCatalog } from '@hexrace/tile';

import { type TrackFileError, type TrackParse } from '@track/entity/file-error';
import { type Track, type TrackMode, TRACK_MODES } from '@track/entity/track';
import { TileText } from '@track/format/tile-text';

const HEADER_COMMENT: readonly string[] = [
  '# One line per tile, in the order of travel. The entry face is always 6.',
  '# exit exit face · pos/w road position and width at the exit · sh shoulders left,right',
  '# h height in steps · t road/shoulder/landscape ranks · obs obstacles (see obstacle-text.ts)',
];

interface Reading {
  readonly header: Map<string, string>;
  readonly tiles: Tile[];
  readonly errors: TrackFileError[];
  formatSeen: boolean;
  inTiles: boolean;
  tileLines: number;
}

/**
 * The track file (functional spec 5.4, technical spec 3.3): UTF-8 text, one instruction per line,
 * `#` opens a comment, blank lines are skipped. The reader goes through the whole file and reports
 * every problem with its line number; one problem and no track comes back. The writer lines the
 * columns up and omits defaults, and reading what it writes gives the track back unchanged.
 */
@Injectable({ providedIn: 'root' })
export class TrackFiles {
  /** The name of the format and the only version this reader accepts. */
  readonly format = 'hexrace-track';
  readonly version = 1;

  private readonly environments = inject(EnvironmentCatalog);
  private readonly tiles = inject(TileText);

  parse(text: string): TrackParse {
    const reading: Reading = {
      header: new Map<string, string>(),
      tiles: [],
      errors: [],
      formatSeen: false,
      inTiles: false,
      tileLines: 0,
    };
    text.split(/\r?\n/).forEach((raw: string, index: number) => {
      this.read(reading, raw.split('#')[0]!.trim(), index + 1);
    });
    return this.finish(reading);
  }

  serialize(track: Track): string {
    const lines = [
      `${this.format} ${String(this.version)}`,
      '',
      `id: ${track.id}`,
      `name: ${track.name}`,
      `environment: ${track.environment}${this.environmentName(track.environment)}`,
      `mode: ${track.mode}`,
    ];
    if (track.laps !== undefined) lines.push(`laps: ${String(track.laps)}`);
    lines.push('', ...HEADER_COMMENT, '', '[tiles]');
    track.tiles.forEach((tile: Tile, index: number) => {
      lines.push(this.tiles.serialize(tile, index === 0));
    });
    return `${lines.join('\n')}\n`;
  }

  private read(reading: Reading, line: string, at: number): void {
    if (line === '') return;
    if (!reading.formatSeen) {
      this.readFormat(reading, line, at);
      return;
    }
    if (line === '[tiles]') {
      reading.inTiles = true;
      return;
    }
    if (!reading.inTiles) {
      const m = /^([a-z]+)\s*:(.*)$/.exec(line);
      if (m?.[1]) reading.header.set(m[1], m[2]!.trim());
      else reading.errors.push({ line: at, message: `expected "key: value", read "${line}"` });
      return;
    }
    const parsed = this.tiles.parse(line, at, reading.tileLines === 0);
    reading.tileLines++;
    reading.errors.push(...parsed.errors);
    if (parsed.tile) reading.tiles.push(parsed.tile);
  }

  private readFormat(reading: Reading, line: string, at: number): void {
    reading.formatSeen = true;
    const m = /^(\S+)\s+(\d+)$/.exec(line);
    if (m?.[1] !== this.format) {
      reading.errors.push({ line: at, message: `expected ${this.quoted()} on the first line` });
    } else if (Number(m[2]) !== this.version) {
      reading.errors.push({
        line: at,
        message: `version ${m[2]!} is unknown, expected ${String(this.version)}`,
      });
    }
  }

  private finish(reading: Reading): TrackParse {
    const { header, errors } = reading;
    if (!reading.formatSeen)
      errors.push({ line: 0, message: `empty file: expected ${this.quoted()}` });
    const id = header.get('id') ?? '';
    const name = header.get('name') ?? '';
    const environment = header.get('environment') ?? '';
    const mode = header.get('mode') ?? '';
    const laps = header.get('laps');
    if (id === '') errors.push({ line: 0, message: 'header: "id" is missing' });
    if (name === '') errors.push({ line: 0, message: 'header: "name" is missing' });
    if (!this.environments.isId(environment)) {
      errors.push({ line: 0, message: `header: environment "${environment}" is unknown` });
    }
    if (!this.isMode(mode)) {
      errors.push({
        line: 0,
        message: `header: mode "${mode}" is unknown, expected track or rally`,
      });
    }
    if (laps !== undefined && !/^\d+$/.test(laps)) {
      errors.push({ line: 0, message: 'header: "laps" must be a whole number' });
    }
    if (!reading.inTiles) errors.push({ line: 0, message: 'the [tiles] section is missing' });
    if (errors.length > 0 || !this.environments.isId(environment) || !this.isMode(mode)) {
      return { errors };
    }
    return {
      track: {
        id,
        name,
        environment,
        mode,
        ...(laps === undefined ? {} : { laps: Number(laps) }),
        tiles: reading.tiles,
      },
    };
  }

  private environmentName(environment: EnvironmentId): string {
    return this.environments.isId(environment)
      ? `  # ${this.environments.of(environment).name}`
      : '';
  }

  private quoted(): string {
    return `"${this.format} ${String(this.version)}"`;
  }

  private isMode(value: string): value is TrackMode {
    return (TRACK_MODES as readonly string[]).includes(value);
  }
}
