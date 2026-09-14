import { type Barrier } from '@tile/entity/obstacles/barrier';
import { type Hazard } from '@tile/entity/obstacles/hazard';
import { type Patch } from '@tile/entity/obstacles/patch';
import { type RoadBand } from '@tile/entity/obstacles/road-band';

export const MEDIUM_HAZARD: Hazard = { kind: 'hazard', size: 'medium', at: 0.5, offset: 0 };

export const SMALL_HAZARD_RIGHT: Hazard = { kind: 'hazard', size: 'small', at: 0.25, offset: 2 };

export const RIGHT_BARRIER: Barrier = { kind: 'barrier', side: 'right', from: 0, to: 1 };

export const LEFT_BARRIER: Barrier = { kind: 'barrier', side: 'left', from: 0, to: 1 };

export const RAMP: RoadBand = { kind: 'ramp', from: 0.3, to: 0.7 };

export const BUMP: RoadBand = { kind: 'bump', from: 0.2, to: 0.3 };

export const PATCH: Patch = { kind: 'patch', from: 0.4, to: 0.6, offset: 0.5, width: 1, road: 3 };
