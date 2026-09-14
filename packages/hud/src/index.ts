/**
 * The HUD: the only package with Angular components. `debug/` is the developer's lil-gui panel;
 * `game/` what the race shows over the canvas; `commons/` what the menus share; `dialog/` the boxes.
 * Every component is a function of its inputs and knows nothing of a car or a track: the modules
 * that produce the values feed them.
 */
export { type GUI as DebugFolder } from 'lil-gui';

export { CanvasFrame, type FrameSize } from '@hud/commons/canvas-frame';
export { CarCard, type CarSummary } from '@hud/commons/car-card';
export { Credits } from '@hud/commons/credits';
export { FormatTimePipe } from '@hud/commons/format-time-pipe';
export { StatBars, type Stat } from '@hud/commons/stat-bars';
export { TrackCard, type TrackSummary } from '@hud/commons/track-card';
export { type CurveEditorOptions, type CurvePoint } from '@hud/debug/curve-editor';
export { CurveEditors } from '@hud/debug/curve-editors';
export { DebugPanel } from '@hud/debug/debug-panel';
export { FrameLoop } from '@hud/debug/frame-loop';
export { PerfCorner } from '@hud/debug/perf-corner';
export { PerfMeter } from '@hud/debug/perf-meter';
export { DebugPlots } from '@hud/debug/debug-plots';
export { ResultsDialog, type RaceResult, type ResultsChoice } from '@hud/dialog/results-dialog';
export { ResultsDialogs } from '@hud/dialog/results-dialogs';
export { AssistLamps, type AssistReadout } from '@hud/game/assist-lamps';
export { Countdown } from '@hud/game/countdown';
export { DamageIndicator } from '@hud/game/damage-indicator';
export {
  DAMAGE_PARTS,
  INTACT_DAMAGE,
  type DamagePart,
  type DamageReadout,
} from '@hud/game/damage-readout';
export { GearIndicator } from '@hud/game/gear-indicator';
export { RaceTimer, type RaceMode, type TimerReadout } from '@hud/game/race-timer';
export { ResetGauge } from '@hud/game/reset-gauge';
export { RevCounter } from '@hud/game/rev-counter';
export { SpeedIndicator } from '@hud/game/speed-indicator';
export { TouchPaddles } from '@hud/game/touch-paddles';
export { WrongWay } from '@hud/game/wrong-way';
