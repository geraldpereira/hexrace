import { Injectable, inject } from '@angular/core';
import { type Vec2 } from '@hexrace/commons';
import {
  type Environment,
  type SPoint,
  EnvironmentCatalog,
  Layout,
  SIDE,
  TileGeometry,
  TileLines,
} from '@hexrace/tile';
import {
  type PlacedTile,
  type Placement,
  type PlayerPose,
  type Track,
  TrackSweeps,
} from '@hexrace/track';

/** A point of the canvas, in pixels. */
export interface MapPoint {
  readonly x: number;
  readonly y: number;
}

/** Everything the map draws: the laid track, what the validation refused, the window, the player. */
export interface MapView {
  readonly track: Track;
  readonly placement: Placement;
  readonly environment: Environment;
  readonly faulty: ReadonlySet<number>;
  readonly window: ReadonlySet<number>;
  readonly player: PlayerPose | null;
}

const MARGIN = SIDE * 1.5;
const EDGE = '#0c0a09';
const OUTSIDE = 'rgba(12, 10, 9, 0.72)';
const FAULTY = 'rgba(239, 68, 68, 0.35)';
const PLAYER = '#f97316';
const START = '#fbbf24';
const LABEL = '#fafaf9';

/**
 * The track seen from above on a 2D canvas: the same zone polygons the mesh is made of, the tile
 * numbers, the start tile ringed, the tiles outside the window dimmed and the faulty ones in red.
 * It is how the placement is checked at a glance, and the first shape of the HUD's tile preview.
 */
@Injectable({ providedIn: 'root' })
export class TrackMap {
  private readonly environments = inject(EnvironmentCatalog);
  private readonly geometry = inject(TileGeometry);
  private readonly layout = inject(Layout);
  private readonly lines = inject(TileLines);
  private readonly sweeps = inject(TrackSweeps);

  draw(canvas: HTMLCanvasElement, view: MapView): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (view.placement.tiles.length === 0) return;
    const centers = view.placement.tiles.map((placed: PlacedTile) =>
      this.layout.cellToWorld(placed.cell),
    );
    const to = this.projection(canvas, centers);
    const scale = this.scale(canvas, centers);
    for (const placed of view.placement.tiles) this.tile(ctx, to, view, placed);
    if (view.player) this.dot(ctx, to(view.player.point), Math.max(3, scale * 0.6), PLAYER);
    this.labels(ctx, to, centers, scale);
  }

  private tile(
    ctx: CanvasRenderingContext2D,
    to: (p: Vec2) => MapPoint,
    view: MapView,
    placed: PlacedTile,
  ): void {
    const sweep = this.sweeps.of(view.track, placed);
    for (const zone of this.geometry.polygons(sweep)) {
      this.shape(
        ctx,
        to,
        zone.points,
        this.environments.zoneColor(view.environment, zone.zone, zone.type),
      );
    }
    const line = this.sweeps.buildOf(view.track, placed, 0).line;
    if (line !== null && line !== undefined) {
      for (const square of this.lines.squares(sweep, line)) {
        this.shape(ctx, to, square.points, square.dark ? '#111111' : '#f5f5f4');
      }
    }
    const corners = this.layout.corners(sweep.center).map((p: Vec2) => ({ at: p, s: 0 }));
    this.shape(ctx, to, corners, null, EDGE);
    if (!view.window.has(placed.index)) this.shape(ctx, to, corners, OUTSIDE);
    if (view.faulty.has(placed.index)) this.shape(ctx, to, corners, FAULTY, '#ef4444');
  }

  private labels(
    ctx: CanvasRenderingContext2D,
    to: (p: Vec2) => MapPoint,
    centers: readonly Vec2[],
    scale: number,
  ): void {
    ctx.font = `${String(Math.max(9, SIDE * scale * 0.35))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    centers.forEach((center: Vec2, index: number) => {
      const point = to(center);
      if (index === 0) this.ring(ctx, point, SIDE * scale * 0.3, START);
      ctx.fillStyle = LABEL;
      ctx.fillText(String(index), point.x, point.y);
    });
  }

  private shape(
    ctx: CanvasRenderingContext2D,
    to: (p: Vec2) => MapPoint,
    points: readonly SPoint[],
    fill: string | null,
    stroke?: string,
  ): void {
    ctx.beginPath();
    points.forEach((point: SPoint, index: number) => {
      const c = to(point.at);
      if (index === 0) ctx.moveTo(c.x, c.y);
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
  }

  private dot(ctx: CanvasRenderingContext2D, at: MapPoint, radius: number, color: string): void {
    ctx.beginPath();
    ctx.arc(at.x, at.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  private ring(ctx: CanvasRenderingContext2D, at: MapPoint, radius: number, color: string): void {
    ctx.beginPath();
    ctx.arc(at.x, at.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private scale(canvas: HTMLCanvasElement, centers: readonly Vec2[]): number {
    const box = this.box(centers);
    return Math.min(canvas.width / (box.maxX - box.minX), canvas.height / (box.maxY - box.minY));
  }

  private projection(canvas: HTMLCanvasElement, centers: readonly Vec2[]): (p: Vec2) => MapPoint {
    const box = this.box(centers);
    const k = this.scale(canvas, centers);
    const offsetX = (canvas.width - (box.maxX - box.minX) * k) / 2;
    const offsetY = (canvas.height - (box.maxY - box.minY) * k) / 2;
    return (p: Vec2) => ({
      x: offsetX + (p.x - box.minX) * k,
      y: canvas.height - offsetY - (p.y - box.minY) * k,
    });
  }

  private box(centers: readonly Vec2[]): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } {
    const xs = centers.map((c: Vec2) => c.x);
    const ys = centers.map((c: Vec2) => c.y);
    return {
      minX: Math.min(...xs) - MARGIN,
      maxX: Math.max(...xs) + MARGIN,
      minY: Math.min(...ys) - MARGIN,
      maxY: Math.max(...ys) + MARGIN,
    };
  }
}
