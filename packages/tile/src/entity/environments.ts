import { type Environment, type EnvironmentId } from '@tile/entity/environment';
import { type TransitionSpan } from '@tile/entity/path';

export const ENVIRONMENT_IDS: readonly EnvironmentId[] = ['north', 'europe', 'africa'];

const FULL: TransitionSpan = { start: 0, end: 1 };

/** The three environments of the functional spec 2.2, by id. */
export const ENVIRONMENTS: Readonly<Record<EnvironmentId, Environment>> = {
  europe: {
    id: 'europe',
    name: 'Europe',
    colors: {
      road: ['#3f3f46', '#57534e', '#78716c'],
      shoulder: ['#a8a29e', '#84cc16', '#d6d3d1'],
      landscape: ['#4d7c0f', '#365314'],
    },
    faceRoads: 3,
    transition: FULL,
  },
  north: {
    id: 'north',
    name: 'North',
    colors: {
      road: ['#94a3b8', '#cbd5e1', '#bae6fd'],
      shoulder: ['#e2e8f0', '#f1f5f9', '#7dd3fc'],
      landscape: ['#f8fafc', '#1e3a5f'],
    },
    faceRoads: 2,
    transition: FULL,
  },
  africa: {
    id: 'africa',
    name: 'Africa',
    colors: {
      road: ['#a16207', '#ca8a04', '#eab308'],
      shoulder: ['#d6d3d1', '#fde68a', '#fed7aa'],
      landscape: ['#b45309', '#78350f'],
    },
    faceRoads: 3,
    transition: FULL,
  },
};
