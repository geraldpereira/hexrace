/**
 * The HUD: the only package with Angular components. For now its `debug` sub-module, the developer's
 * lil-gui panel (`DebugPanel.register` for a folder, curve editors and plots as rows) with the
 * performance meter and its corner overlay. `startFrameLoop` is the per-frame refresh every
 * display shares until the engine has a loop of its own.
 */
export { type GUI as DebugFolder } from 'lil-gui';

export { addCurveEditor, type CurvePoint } from '@hud/debug/curve-editor';
export { DebugPanel } from '@hud/debug/debug-panel';
export { startFrameLoop } from '@hud/debug/frame-loop';
export { PerfCorner } from '@hud/debug/perf-corner';
export { PerfMeter } from '@hud/debug/perf-meter';
export { addPlot } from '@hud/debug/plot';
