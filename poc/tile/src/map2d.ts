import type { Placement, PlacedTile } from './model';
import {
    APOTHEM,
    SIDE,
    add,
    blockSpan,
    cellToWorld,
    entryFrame,
    exitFrame,
    exitHeading,
    facePoint,
    hexCorners,
    roadSpan,
    scale,
} from './model';
import type { FaceFrame, Vec2 } from './model';

/**
 * Carte 2D vue du dessus d'une piste placée : sert à vérifier le placement à l'œil avant toute 3D.
 * Chaque tuile montre son hexagone, le bloc bas-côtés, la piste, son numéro ; la tuile de départ
 * est cerclée.
 */

const LANDSCAPE = ['#4d7c0f', '#365314'];
const SHOULDER = ['#a8a29e', '#78716c', '#d6d3d1'];
const ROAD = ['#3f3f46', '#57534e', '#1c1917'];

/** Profondeur, depuis la face, sur laquelle le profil reste constant ; le reste est la transition. */
const CONSTANT_DEPTH = APOTHEM * 0.6;

export function drawTrackMap(canvas: HTMLCanvasElement, placement: Placement): void {
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
        const inn = entryFrame(center, placed.heading);
        const out = exitFrame(center, exitHeading(placed.heading, tile.exit));
        band(
            polygon,
            inn,
            out,
            blockSpan(entry),
            blockSpan(tile.profile),
            SHOULDER[entry.shoulder - 1] ?? '#000',
        );
        band(
            polygon,
            inn,
            out,
            roadSpan(entry),
            roadSpan(tile.profile),
            ROAD[entry.road - 1] ?? '#000',
        );
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

/** Une zone (bloc ou piste) de la face d'entrée à la face de sortie : constante près des faces, transition au milieu. */
function band(
    polygon: (points: Vec2[], fill: string) => void,
    inn: FaceFrame,
    out: FaceFrame,
    [inL, inR]: [number, number],
    [outL, outR]: [number, number],
    fill: string,
): void {
    const a = facePoint(inn, inL);
    const b = facePoint(inn, inR);
    const a2 = facePoint(inn, inL, CONSTANT_DEPTH);
    const b2 = facePoint(inn, inR, CONSTANT_DEPTH);
    const c2 = facePoint(out, outR, -CONSTANT_DEPTH);
    const d2 = facePoint(out, outL, -CONSTANT_DEPTH);
    const c = facePoint(out, outR);
    const d = facePoint(out, outL);
    polygon([a, b, b2, a2], fill);
    polygon([a2, b2, c2, d2], fill);
    polygon([d2, c2, c, d], fill);
}

function drawHeights(
    ctx: CanvasRenderingContext2D,
    toCanvas: (p: Vec2) => Vec2,
    center: Vec2,
    placed: PlacedTile,
): void {
    const { entry, tile, heading } = placed;
    if (entry.height === tile.profile.height) return;
    const inn = entryFrame(center, heading);
    const p = toCanvas(add(center, scale(inn.travel, -APOTHEM * 0.45)));
    ctx.fillStyle = '#fde68a';
    ctx.fillText(`${entry.height}→${tile.profile.height}`, p.x, p.y);
}
