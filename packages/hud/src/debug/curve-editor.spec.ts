import { GUI } from 'lil-gui';

import { fakeContext, mockCanvasContext } from '@hud/debug/canvas.mock';
import { CurveEditor, addCurveEditor, type CurvePoint } from '@hud/debug/curve-editor';

const POINTS: CurvePoint[] = [
  { x: 0, y: 0 },
  { x: 0.5, y: 1 },
  { x: 1, y: 0 },
];

function pointer(type: string, x: number, y: number, extra: MouseEventInit = {}): MouseEvent {
  const event = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true, ...extra });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  return event;
}

describe('CurveEditor', () => {
  let changes: CurvePoint[][];
  let editor: CurveEditor;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    changes = [];
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    editor = new CurveEditor({
      xRange: [0, 1],
      yRange: [0, 1],
      initialPoints: POINTS,
      onChange: (pts) => changes.push(pts.map((p) => ({ ...p }))),
    });
    document.body.appendChild(editor.element);
    canvas = editor.element.querySelector('canvas')!;
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0 }) as DOMRect;
    canvas.setPointerCapture = () => undefined;
    canvas.releasePointerCapture = () => {
      throw new Error('nothing captured');
    };
  });

  afterEach(() => {
    editor.element.remove();
  });

  function px(point: CurvePoint): [number, number] {
    const plotW = 240 - 28 - 8;
    const plotH = 120 - 6 - 16;
    return [28 + point.x * plotW, 6 + (1 - point.y) * plotH];
  }

  it('starts from the given points and copies them', () => {
    expect(editor.getPoints()).toEqual(POINTS);
    expect(editor.getPoints()).not.toBe(POINTS);
  });

  it('drags a point, keeping it between its neighbours', () => {
    const [x, y] = px(POINTS[1]!);
    canvas.dispatchEvent(pointer('pointerdown', x, y));
    canvas.dispatchEvent(pointer('pointermove', 1000, y + 20));
    canvas.dispatchEvent(pointer('pointerup', 1000, y + 20));
    const moved = editor.getPoints()[1]!;
    expect(moved.x).toBe(1);
    expect(moved.y).toBeLessThan(1);
    expect(changes.length).toBeGreaterThan(0);
  });

  it('adds a point on double-click and removes one on shift-click, never below two', () => {
    const [x, y] = px({ x: 0.25, y: 0.5 });
    canvas.dispatchEvent(pointer('dblclick', x, y));
    expect(editor.getPoints().length).toBe(4);
    canvas.dispatchEvent(pointer('pointerdown', x, y, { shiftKey: true }));
    expect(editor.getPoints().length).toBe(3);
    const [x1, y1] = px(POINTS[1]!);
    canvas.dispatchEvent(pointer('pointerdown', x1, y1, { button: 2 }));
    expect(editor.getPoints().length).toBe(2);
    const [x0, y0] = px(POINTS[0]!);
    canvas.dispatchEvent(pointer('pointerdown', x0, y0, { shiftKey: true }));
    expect(editor.getPoints().length).toBe(2);
  });

  it('ignores a press away from any point, and a move with nothing dragged', () => {
    canvas.dispatchEvent(pointer('pointerdown', 150, 60));
    canvas.dispatchEvent(pointer('pointermove', 151, 61));
    canvas.dispatchEvent(pointer('pointerup', 151, 61));
    expect(changes).toEqual([]);
  });

  it('resets to the initial points and accepts new ones', () => {
    editor.setPoints([
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ]);
    expect(editor.getPoints().length).toBe(2);
    editor.element.querySelector<HTMLButtonElement>('button:last-child')!.click();
    expect(editor.getPoints()).toEqual(POINTS);
  });

  it('opens a full-screen copy that edits the same curve, and closes it', () => {
    editor.element.querySelector('button')!.click();
    const overlay = document.body.lastElementChild!;
    expect(overlay.querySelector('canvas')).not.toBeNull();
    editor.element.querySelector('button')!.click();
    expect(document.body.lastElementChild).toBe(overlay);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(overlay.isConnected).toBe(false);

    editor.element.querySelector('button')!.click();
    const again = document.body.lastElementChild!;
    again.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(again.isConnected).toBe(false);
  });

  it('paints when it has a context, lighting the point under the pointer', () => {
    const fake = fakeContext();
    mockCanvasContext(fake);
    const painted = new CurveEditor({
      xRange: [0, 1],
      yRange: [0, 1],
      initialPoints: POINTS,
      onChange: () => undefined,
    });
    const before = fake.calls.length;
    const c = painted.element.querySelector('canvas')!;
    c.getBoundingClientRect = () => ({ left: 0, top: 0 }) as DOMRect;
    const [x, y] = px(POINTS[1]!);
    c.dispatchEvent(pointer('pointermove', x, y));
    expect(fake.calls.length).toBeGreaterThan(before);
    expect(fake.calls.some((call) => call.startsWith('arc(') && call.includes(',5,0,'))).toBe(true);
  });

  it('mounts as a row of a lil-gui folder', () => {
    const gui = new GUI({ autoPlace: false });
    const mounted = addCurveEditor(gui, {
      xRange: [0, 1],
      yRange: [0, 2],
      initialPoints: POINTS,
      onChange: () => undefined,
    });
    expect(gui.$children.contains(mounted.element)).toBe(true);
    gui.destroy();
  });
});
