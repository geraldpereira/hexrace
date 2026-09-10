import type GUI from 'lil-gui';

export interface CurvePoint {
    x: number;
    y: number;
}

export interface CurveEditorOptions {
    width?: number;
    height?: number;
    xRange: [number, number];
    yRange: [number, number];
    xLabel?: string;
    yLabel?: string;
    initialPoints: readonly CurvePoint[];
    onChange: (points: readonly CurvePoint[]) => void;
    /** Adds an `expand` button that opens a full-screen overlay editor. Default true. */
    expandable?: boolean;
}

const OVERLAY_W = 720;
const OVERLAY_H = 460;

const DEFAULT_W = 240;
const DEFAULT_H = 120;
const HIT_RADIUS = 8;
const MARGIN_L = 28;
const MARGIN_R = 8;
const MARGIN_T = 6;
const MARGIN_B = 16;

/**
 * Lightweight piecewise-linear curve editor: click-and-drag points,
 * double-click to add, shift-click to remove. Drives an onChange callback
 * each time the curve mutates. No external dependency; the host (e.g. a
 * lil-gui folder) just needs to mount `element` in the DOM.
 */
export class CurveEditor {
    readonly element: HTMLDivElement;
    private readonly canvas: HTMLCanvasElement;
    private readonly ctx: CanvasRenderingContext2D;
    private readonly width: number;
    private readonly height: number;
    private readonly xMin: number;
    private readonly xMax: number;
    private readonly yMin: number;
    private readonly yMax: number;
    private readonly initial: CurvePoint[];
    private readonly onChange: (points: readonly CurvePoint[]) => void;

    private points: CurvePoint[];
    private draggingIdx: number | null = null;
    private hoverIdx: number | null = null;
    private overlay: { root: HTMLDivElement; editor: CurveEditor; onKey: (e: KeyboardEvent) => void } | null =
        null;
    private readonly xLabel: string;
    private readonly yLabel: string;

    constructor(opts: CurveEditorOptions) {
        this.width = opts.width ?? DEFAULT_W;
        this.height = opts.height ?? DEFAULT_H;
        [this.xMin, this.xMax] = opts.xRange;
        [this.yMin, this.yMax] = opts.yRange;
        this.initial = opts.initialPoints.map((p) => ({ x: p.x, y: p.y }));
        this.points = opts.initialPoints.map((p) => ({ x: p.x, y: p.y }));
        this.onChange = opts.onChange;
        this.xLabel = opts.xLabel ?? 'x';
        this.yLabel = opts.yLabel ?? 'y';

        this.element = document.createElement('div');
        this.element.style.cssText = 'display:flex;flex-direction:column;gap:2px;padding:4px 0;';

        const header = document.createElement('div');
        header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;font-size:11px;gap:4px;';
        const title = document.createElement('span');
        title.textContent = `${this.xLabel} → ${this.yLabel}`;
        title.style.cssText = 'opacity:0.7;flex:1;';
        const actions = document.createElement('span');
        actions.style.cssText = 'display:flex;gap:4px;';
        const btnStyle =
            'font-size:10px;padding:1px 6px;background:#2c2c2c;color:#ddd;border:1px solid #444;cursor:pointer;';
        if (opts.expandable !== false) {
            const expand = document.createElement('button');
            expand.textContent = 'expand';
            expand.style.cssText = btnStyle;
            expand.addEventListener('click', () => {
                this.openOverlay();
            });
            actions.appendChild(expand);
        }
        const reset = document.createElement('button');
        reset.textContent = 'reset';
        reset.style.cssText = btnStyle;
        reset.addEventListener('click', () => {
            this.reset();
        });
        actions.appendChild(reset);
        header.appendChild(title);
        header.appendChild(actions);
        this.element.appendChild(header);

        this.canvas = document.createElement('canvas');
        this.canvas.style.cssText = `width:${String(this.width)}px;height:${String(this.height)}px;background:#1c1c1c;border:1px solid #333;display:block;`;
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        const ctx = this.canvas.getContext('2d');
        if (!ctx) throw new Error('CurveEditor: 2D context not available');
        this.ctx = ctx;
        this.ctx.scale(dpr, dpr);
        this.element.appendChild(this.canvas);

        this.canvas.addEventListener('pointerdown', this.onPointerDown);
        this.canvas.addEventListener('pointermove', this.onPointerMove);
        this.canvas.addEventListener('pointerup', this.onPointerUp);
        this.canvas.addEventListener('pointercancel', this.onPointerUp);
        this.canvas.addEventListener('dblclick', this.onDoubleClick);
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });

        this.draw();
    }

    getPoints(): readonly CurvePoint[] {
        return this.points;
    }

    setPoints(points: readonly CurvePoint[]): void {
        this.points = points.map((p) => ({ x: p.x, y: p.y }));
        this.draw();
        this.onChange(this.points);
    }

    private reset(): void {
        this.points = this.initial.map((p) => ({ x: p.x, y: p.y }));
        this.draw();
        this.onChange(this.points);
    }

    private openOverlay(): void {
        if (this.overlay) return;
        const root = document.createElement('div');
        root.style.cssText =
            'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;';

        const panel = document.createElement('div');
        panel.style.cssText = 'background:#1a1a1a;padding:18px;border:1px solid #444;color:#ddd;font-family:system-ui,sans-serif;';

        const editor = new CurveEditor({
            width: OVERLAY_W,
            height: OVERLAY_H,
            xRange: [this.xMin, this.xMax],
            yRange: [this.yMin, this.yMax],
            xLabel: this.xLabel,
            yLabel: this.yLabel,
            initialPoints: this.initial,
            expandable: false,
            onChange: (pts) => {
                // Mirror the overlay edits back into the inline editor and
                // forward to the host so the simulation updates in real time.
                this.points = pts.map((p) => ({ x: p.x, y: p.y }));
                this.draw();
                this.onChange(this.points);
            },
        });
        // Start the overlay from the current state, not the original defaults.
        editor.setPoints(this.points);
        panel.appendChild(editor.element);

        const footer = document.createElement('div');
        footer.style.cssText = 'display:flex;justify-content:flex-end;margin-top:10px;';
        const close = document.createElement('button');
        close.textContent = 'close';
        close.style.cssText =
            'font-size:12px;padding:4px 14px;background:#2c2c2c;color:#ddd;border:1px solid #444;cursor:pointer;';
        close.addEventListener('click', () => {
            this.closeOverlay();
        });
        footer.appendChild(close);
        panel.appendChild(footer);

        root.appendChild(panel);
        document.body.appendChild(root);

        const onKey = (e: KeyboardEvent): void => {
            if (e.key === 'Escape') this.closeOverlay();
        };
        window.addEventListener('keydown', onKey);
        root.addEventListener('click', (e) => {
            if (e.target === root) this.closeOverlay();
        });

        this.overlay = { root, editor, onKey };
    }

    private closeOverlay(): void {
        if (!this.overlay) return;
        document.body.removeChild(this.overlay.root);
        window.removeEventListener('keydown', this.overlay.onKey);
        this.overlay = null;
    }

    private xToPx(x: number): number {
        const plotW = this.width - MARGIN_L - MARGIN_R;
        return MARGIN_L + ((x - this.xMin) / (this.xMax - this.xMin)) * plotW;
    }

    private yToPx(y: number): number {
        const plotH = this.height - MARGIN_T - MARGIN_B;
        return MARGIN_T + (1 - (y - this.yMin) / (this.yMax - this.yMin)) * plotH;
    }

    private pxToData(px: number, py: number): CurvePoint {
        const plotW = this.width - MARGIN_L - MARGIN_R;
        const plotH = this.height - MARGIN_T - MARGIN_B;
        const x = this.xMin + ((px - MARGIN_L) / plotW) * (this.xMax - this.xMin);
        const y = this.yMin + (1 - (py - MARGIN_T) / plotH) * (this.yMax - this.yMin);
        return {
            x: clamp(x, this.xMin, this.xMax),
            y: clamp(y, this.yMin, this.yMax),
        };
    }

    private pickPoint(px: number, py: number): number | null {
        for (let i = 0; i < this.points.length; i++) {
            const p = this.points[i];
            if (!p) continue;
            const dx = this.xToPx(p.x) - px;
            const dy = this.yToPx(p.y) - py;
            if (dx * dx + dy * dy <= HIT_RADIUS * HIT_RADIUS) return i;
        }
        return null;
    }

    private localPointer(e: PointerEvent | MouseEvent): { x: number; y: number } {
        const rect = this.canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    private onPointerDown = (e: PointerEvent): void => {
        const { x, y } = this.localPointer(e);
        const idx = this.pickPoint(x, y);
        if (idx === null) return;
        if (e.shiftKey || e.button === 2) {
            if (this.points.length > 2) {
                this.points.splice(idx, 1);
                this.draw();
                this.onChange(this.points);
            }
            return;
        }
        this.draggingIdx = idx;
        this.canvas.setPointerCapture(e.pointerId);
    };

    private onPointerMove = (e: PointerEvent): void => {
        const { x, y } = this.localPointer(e);
        if (this.draggingIdx !== null) {
            const target = this.pxToData(x, y);
            const idx = this.draggingIdx;
            const prev = this.points[idx - 1];
            const next = this.points[idx + 1];
            // Keep the curve monotone in X: clamp this point between its
            // neighbours so the segments never cross.
            const minX = prev ? prev.x : this.xMin;
            const maxX = next ? next.x : this.xMax;
            const p = this.points[idx];
            if (!p) return;
            p.x = clamp(target.x, minX, maxX);
            p.y = target.y;
            this.draw();
            this.onChange(this.points);
        } else {
            const newHover = this.pickPoint(x, y);
            if (newHover !== this.hoverIdx) {
                this.hoverIdx = newHover;
                this.draw();
            }
        }
    };

    private onPointerUp = (e: PointerEvent): void => {
        if (this.draggingIdx === null) return;
        this.draggingIdx = null;
        try {
            this.canvas.releasePointerCapture(e.pointerId);
        } catch {
            // older pointer events may not have captured anything
        }
    };

    private onDoubleClick = (e: MouseEvent): void => {
        const { x, y } = this.localPointer(e);
        const data = this.pxToData(x, y);
        // Insert at the right position to keep X-monotone ordering.
        let insertAt = this.points.length;
        for (let i = 0; i < this.points.length; i++) {
            const p = this.points[i];
            if (p && p.x > data.x) {
                insertAt = i;
                break;
            }
        }
        this.points.splice(insertAt, 0, data);
        this.draw();
        this.onChange(this.points);
    };

    private draw(): void {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        ctx.fillStyle = '#1c1c1c';
        ctx.fillRect(0, 0, w, h);

        // Grid
        ctx.strokeStyle = '#2c2c2c';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 1; i < 4; i++) {
            const x = MARGIN_L + ((w - MARGIN_L - MARGIN_R) * i) / 4;
            ctx.moveTo(x, MARGIN_T);
            ctx.lineTo(x, h - MARGIN_B);
        }
        for (let i = 1; i < 3; i++) {
            const y = MARGIN_T + ((h - MARGIN_T - MARGIN_B) * i) / 3;
            ctx.moveTo(MARGIN_L, y);
            ctx.lineTo(w - MARGIN_R, y);
        }
        ctx.stroke();

        // Axes
        ctx.strokeStyle = '#555';
        ctx.beginPath();
        ctx.moveTo(MARGIN_L, MARGIN_T);
        ctx.lineTo(MARGIN_L, h - MARGIN_B);
        ctx.lineTo(w - MARGIN_R, h - MARGIN_B);
        ctx.stroke();

        // Axis labels
        ctx.fillStyle = '#888';
        ctx.font = '10px monospace';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'right';
        ctx.fillText(this.yMax.toFixed(1), MARGIN_L - 3, MARGIN_T + 2);
        ctx.fillText(this.yMin.toFixed(1), MARGIN_L - 3, h - MARGIN_B - 2);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(this.xMin.toFixed(2), MARGIN_L, h - MARGIN_B + 2);
        ctx.fillText(this.xMax.toFixed(2), w - MARGIN_R, h - MARGIN_B + 2);

        // Curve
        if (this.points.length >= 2) {
            ctx.strokeStyle = '#ffaa00';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            const first = this.points[0];
            if (first) ctx.moveTo(this.xToPx(first.x), this.yToPx(first.y));
            for (let i = 1; i < this.points.length; i++) {
                const p = this.points[i];
                if (p) ctx.lineTo(this.xToPx(p.x), this.yToPx(p.y));
            }
            ctx.stroke();
        }

        // Points
        for (let i = 0; i < this.points.length; i++) {
            const p = this.points[i];
            if (!p) continue;
            const px = this.xToPx(p.x);
            const py = this.yToPx(p.y);
            const isHover = i === this.hoverIdx || i === this.draggingIdx;
            ctx.fillStyle = isHover ? '#ffd766' : '#ffaa00';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(px, py, isHover ? 5 : 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    }
}

function clamp(v: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, v));
}

/** Mount a CurveEditor as a row inside an existing lil-gui folder. */
export function addCurveEditor(gui: GUI, opts: CurveEditorOptions): CurveEditor {
    const editor = new CurveEditor(opts);
    gui.$children.appendChild(editor.element);
    return editor;
}
