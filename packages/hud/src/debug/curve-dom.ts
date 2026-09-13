const BUTTON_STYLE =
  'font-size:10px;padding:1px 6px;background:#2c2c2c;color:#ddd;border:1px solid #444;cursor:pointer;';

/** The editor's title row: axis labels and the `expand` (when wanted) and `reset` buttons. */
export function buildCurveHeader(
  title: string,
  onExpand: (() => void) | null,
  onReset: () => void,
): HTMLDivElement {
  const header = document.createElement('div');
  header.style.cssText =
    'display:flex;justify-content:space-between;align-items:center;font-size:11px;gap:4px;';
  const label = document.createElement('span');
  label.textContent = title;
  label.style.cssText = 'opacity:0.7;flex:1;';
  const actions = document.createElement('span');
  actions.style.cssText = 'display:flex;gap:4px;';
  if (onExpand) actions.appendChild(button('expand', onExpand));
  actions.appendChild(button('reset', onReset));
  header.appendChild(label);
  header.appendChild(actions);
  return header;
}

/** A canvas sized for the device's pixel ratio, with its 2D context scaled to CSS pixels. */
export function buildCurveCanvas(
  width: number,
  height: number,
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D | null } {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = `width:${String(width)}px;height:${String(height)}px;background:#1c1c1c;border:1px solid #333;display:block;`;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext('2d');
  ctx?.scale(dpr, dpr);
  return { canvas, ctx };
}

function button(text: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.textContent = text;
  b.style.cssText = BUTTON_STYLE;
  b.addEventListener('click', onClick);
  return b;
}
