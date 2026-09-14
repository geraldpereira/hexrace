import {
  type CarController,
  type CarOptions,
  type CarParticles,
  type CarSpec,
  type CarView,
  type ChassisSound,
  type EngineSound,
  type SkidMarks,
  type TyreSound,
} from '@hexrace/car';
import { type SurfaceFeel } from '@hexrace/car';
import { type EnvironmentId } from '@hexrace/tile';

import { type ObstacleSpec } from '@ui/lab/car/obstacle-spec';

/** The title of the showcase's folder in the debug panel, and the key its values are kept under. */
export const BENCH_TITLE = 'Car';

/**
 * What the debug panel of the showcase is allowed to touch. The page implements it; the panel
 * never reaches into the page's own fields, which keeps the two files from growing into each
 * other. Everything here exists only once the physics has loaded and the scene is built.
 */
export interface CarBench {
  readonly spec: CarSpec;
  readonly options: CarOptions;
  readonly obstacles: ObstacleSpec;
  readonly car: CarController;
  readonly view: CarView;
  readonly marks: SkidMarks;
  readonly particles: CarParticles;
  readonly engineSound: EngineSound;
  readonly tyreSound: TyreSound;
  readonly chassisSound: ChassisSound;
  readonly palette: readonly SurfaceFeel[];
  environment: EnvironmentId;
  /** Throws the car away and builds it again from the spec, at its starting place. */
  rebuildCar(): void;
  rebuildGround(): void;
  rebuildObstacles(): void;
  startSound(): void;
  drop(): void;
}
