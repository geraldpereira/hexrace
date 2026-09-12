import type { Vec2 } from './layout';
import type { Placement } from './placement';
import { boundariesAt, heightOfS, tileSweep } from './sweep';
import type { Track } from './track';
import { isClosed } from './track';

/**
 * La fenêtre de tuiles (spec 9.2) : seules `ahead` tuiles devant le joueur et `behind` derrière
 * existent dans la scène. En boucle, la fenêtre passe le départ ; en ligne, elle s'arrête aux bouts.
 * Le joueur est repéré par une **position** continue le long de la piste : partie entière = index
 * de la tuile, partie décimale = avancement `s` sur son axe.
 */

export interface Cursor {
    readonly tile: number;
    readonly s: number;
}

export function cursorAt(position: number, total: number, closed: boolean): Cursor {
    if (total === 0) return { tile: 0, s: 0 };
    const wrapped = closed
        ? ((position % total) + total) % total
        : Math.min(Math.max(position, 0), total - 1e-9);
    const tile = Math.min(total - 1, Math.floor(wrapped));
    return { tile, s: wrapped - tile };
}

export function windowIndices(
    total: number,
    current: number,
    ahead: number,
    behind: number,
    closed: boolean,
): Set<number> {
    const indices = new Set<number>();
    for (let k = -behind; k <= ahead; k++) {
        const i = current + k;
        if (closed) indices.add(((i % total) + total) % total);
        else if (i >= 0 && i < total) indices.add(i);
    }
    return indices;
}

export interface PlayerPose {
    /** Centre de la piste sous le joueur, dans le plan. */
    readonly point: Vec2;
    /** Direction de marche, unitaire. */
    readonly travel: Vec2;
    /** Hauteur du sol, en unités du monde. */
    readonly height: number;
    readonly cursor: Cursor;
}

export function playerPose(
    track: Track,
    placement: Placement,
    position: number,
): PlayerPose | null {
    const cursor = cursorAt(position, placement.tiles.length, isClosed(track));
    const placed = placement.tiles[cursor.tile];
    if (!placed) return null;
    const sweep = tileSweep(placed);
    const b = boundariesAt(sweep, cursor.s);
    return { point: b.center, travel: b.travel, height: heightOfS(sweep, cursor.s), cursor };
}
