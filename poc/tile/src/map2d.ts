import type { Environment, LineMark, Placement, PlacedTile, TransitionSpan, Vec2 } from './model';
import {
    APOTHEM,
    SIDE,
    add,
    cellToWorld,
    checkerSquares,
    entryFrame,
    hexCorners,
    obstacleFootprint,
    scale,
    tilePolygons,
    tileSweep,
    zoneColor,
} from './model';
import { OBSTACLE } from './palette';

/**
 * Carte 2D vue du dessus d'une piste placée : les mêmes polygones de zones que le maillage 3D,
 * les obstacles, le numéro de chaque tuile, la tuile de départ cerclée. Sert à vérifier le
 * placement et préfigure l'aperçu des tuiles suivantes du HUD (spec 7.2).
 */

export function drawTrackMap(
    canvas: HTMLCanvasElement,
    placement: Placement,
    environment: Environment,
    transition?: TransitionSpan,
    faulty: ReadonlySet<number> = new Set(),
    marks: readonly LineMark[] = [],
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
    const offsetX = (canvas.width - (maxX - minX) * k) / 2;
    const offsetY = (canvas.height - (maxY - minY) * k) / 2;
    const toCanvas = (p: Vec2): Vec2 => ({
        x: offsetX + (p.x - minX) * k,
        y: canvas.height - offsetY - (p.y - minY) * k,
    });

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const polygon = (points: Vec2[], fill: string | null, stroke?: string): void => {
        ctx.beginPath();
        points.forEach((p, i) => {
            const c = toCanvas(p);
            if (i === 0) ctx.moveTo(c.x, c.y);
            else ctx.lineTo(c.x, c.y);
        });
        ctx.closePath();
        if (fill) {
            ctx.fillStyle = fill;
            ctx.fill();
        }
        if (stroke) {
            ctx.strokeStyle = stroke;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    };

    placement.tiles.forEach((placed, i) => {
        const center = centers[i];
        if (!center) return;
        const sweep = tileSweep(placed, transition);
        for (const zone of tilePolygons(sweep))
            polygon(zone.points, zoneColor(environment, zone.zone, zone.type));
        for (const obstacle of placed.tile.obstacles ?? []) {
            const { outline, body } = obstacleFootprint(sweep, obstacle);
            const colors = OBSTACLE[obstacle.kind];
            if (obstacle.kind === 'patch')
                polygon(body, zoneColor(environment, 'road', obstacle.road), colors.body);
            else {
                polygon(outline, colors.outline);
                polygon(body, colors.body);
            }
        }
        for (const mark of marks.filter((m) => m.tile === placed.index)) {
            for (const square of checkerSquares(sweep, mark.at)) {
                polygon(square.points, square.dark ? '#111111' : '#f5f5f4');
            }
        }
        polygon(hexCorners(center), null, '#0c0a09');
        if (faulty.has(placed.index))
            polygon(hexCorners(center), 'rgba(239, 68, 68, 0.35)', '#ef4444');
    });

    ctx.font = `${Math.max(9, SIDE * k * 0.35)}px system-ui, sans-serif`;
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
        drawNotes(ctx, toCanvas, center, placed);
    });
}

function drawNotes(
    ctx: CanvasRenderingContext2D,
    toCanvas: (p: Vec2) => Vec2,
    center: Vec2,
    placed: PlacedTile,
): void {
    const { entry, tile, heading } = placed;
    const notes: string[] = [];
    if (entry.height !== tile.profile.height) notes.push(`h${entry.height}→${tile.profile.height}`);
    if (entry.position !== tile.profile.position)
        notes.push(`p${entry.position}→${tile.profile.position}`);
    if (notes.length === 0) return;
    const inn = entryFrame(center, heading);
    const p = toCanvas(add(center, scale(inn.travel, -APOTHEM * 0.45)));
    ctx.fillStyle = '#fde68a';
    ctx.fillText(notes.join(' '), p.x, p.y);
}
