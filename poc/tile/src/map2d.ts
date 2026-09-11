import type { Placement, PlacedTile } from './model';
import {
    APOTHEM,
    SIDE,
    add,
    boundariesAt,
    cellToWorld,
    entryFrame,
    hexCorners,
    obstacleFootprint,
    scale,
    tileSweep,
} from './model';
import type { Boundaries, Obstacle, TransitionSpan, Vec2 } from './model';

/**
 * Carte 2D vue du dessus d'une piste placée : sert à vérifier le placement à l'œil avant toute 3D.
 * Chaque tuile montre son hexagone, le bloc bas-côtés, la piste, son numéro ; la tuile de départ
 * est cerclée.
 */

const LANDSCAPE = ['#4d7c0f', '#365314'];
const SHOULDER = ['#a8a29e', '#78716c', '#d6d3d1'];
const ROAD = ['#3f3f46', '#57534e', '#1c1917'];
const OBSTACLE: Record<Obstacle['kind'], { outline: string; body: string }> = {
    hazard: { outline: 'rgba(251, 146, 60, 0.35)', body: '#f97316' },
    barrier: { outline: 'rgba(255, 255, 255, 0.15)', body: '#ef4444' },
    ramp: { outline: 'rgba(250, 204, 21, 0.35)', body: '#facc15' },
    bump: { outline: 'rgba(163, 163, 163, 0.35)', body: '#a3a3a3' },
    patch: { outline: 'rgba(96, 165, 250, 0.35)', body: '#60a5fa' },
};

/** Échantillons le long de l'axe d'une tuile. */
const SAMPLES = 24;

export function drawTrackMap(
    canvas: HTMLCanvasElement,
    placement: Placement,
    transition?: TransitionSpan,
): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const centers = placement.tiles.map((t) => cellToWorld(t.cell));
    const margin = SIDE * 1.5;
    const xs = centers.map((c) => c.x);
    const ys = centers.map((c) => c.y);
    const minX = Math.min(...xs) - margin;
    const maxX = Math.max(...xs) + margin;
    const minY = Math.min(...ys) - margin;
    const maxY = Math.max(...ys) + margin;
    const k = Math.min(canvas.width / (maxX - minX), canvas.height / (maxY - minY));
    const toCanvas = (p: Vec2): Vec2 => ({
        x: (p.x - minX) * k,
        y: canvas.height - (p.y - minY) * k,
    });

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const polygon = (points: Vec2[], fill: string, stroke?: string): void => {
        ctx.beginPath();
        points.forEach((p, i) => {
            const c = toCanvas(p);
            if (i === 0) ctx.moveTo(c.x, c.y);
            else ctx.lineTo(c.x, c.y);
        });
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        if (stroke) {
            ctx.strokeStyle = stroke;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    };

    placement.tiles.forEach((placed, i) => {
        const center = centers[i];
        if (!center) return;
        const { entry, tile } = placed;
        polygon(hexCorners(center), LANDSCAPE[entry.landscape - 1] ?? '#000', '#0c0a09');
        const sweep = tileSweep(placed, transition);
        const samples = Array.from({ length: SAMPLES + 1 }, (_, i) =>
            boundariesAt(sweep, i / SAMPLES),
        );
        polygon(strip(samples, 'blockLeft', 'blockRight'), SHOULDER[entry.shoulder - 1] ?? '#000');
        polygon(strip(samples, 'roadLeft', 'roadRight'), ROAD[entry.road - 1] ?? '#000');
        for (const obstacle of tile.obstacles ?? []) {
            const { outline, body } = obstacleFootprint(sweep, obstacle);
            const colors = OBSTACLE[obstacle.kind];
            if (obstacle.kind === 'patch')
                polygon(body, ROAD[obstacle.road - 1] ?? '#000', colors.body);
            else {
                polygon(outline, colors.outline);
                polygon(body, colors.body);
            }
        }
    });

    ctx.font = `${Math.max(10, SIDE * k * 0.35)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    placement.tiles.forEach((placed, i) => {
        const center = centers[i];
        if (!center) return;
        const c = toCanvas(center);
        if (i === 0) {
            ctx.beginPath();
            ctx.arc(c.x, c.y, SIDE * k * 0.3, 0, Math.PI * 2);
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        ctx.fillStyle = '#fafaf9';
        ctx.fillText(String(placed.index), c.x, c.y);
        drawHeights(ctx, toCanvas, center, placed);
    });
}

/** Une zone entre deux bords balayés : bord gauche à l'aller, bord droit au retour. */
function strip(samples: Boundaries[], left: keyof Boundaries, right: keyof Boundaries): Vec2[] {
    return [...samples.map((b) => b[left]), ...samples.map((b) => b[right]).reverse()];
}

function drawHeights(
    ctx: CanvasRenderingContext2D,
    toCanvas: (p: Vec2) => Vec2,
    center: Vec2,
    placed: PlacedTile,
): void {
    const { entry, tile, heading } = placed;
    const notes: string[] = [];
    if (entry.height !== tile.profile.height) notes.push(`h${entry.height}→${tile.profile.height}`);
    if (entry.position !== tile.profile.position) {
        notes.push(`p${entry.position}→${tile.profile.position}`);
    }
    if (notes.length === 0) return;
    const inn = entryFrame(center, heading);
    const p = toCanvas(add(center, scale(inn.travel, -APOTHEM * 0.45)));
    ctx.fillStyle = '#fde68a';
    ctx.fillText(notes.join(' '), p.x, p.y);
}
