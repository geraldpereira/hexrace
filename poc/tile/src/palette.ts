import type { Obstacle } from './model';

/** Couleurs par rang de palette (spec 2.2) et par sorte d'obstacle, partagées par la carte 2D et la vue 3D. */
export const LANDSCAPE = ['#4d7c0f', '#365314'];
export const SHOULDER = ['#a8a29e', '#78716c', '#d6d3d1'];
export const ROAD = ['#3f3f46', '#57534e', '#1c1917'];

export const OBSTACLE: Record<Obstacle['kind'], { outline: string; body: string }> = {
    hazard: { outline: 'rgba(251, 146, 60, 0.35)', body: '#f97316' },
    barrier: { outline: 'rgba(255, 255, 255, 0.15)', body: '#ef4444' },
    ramp: { outline: 'rgba(250, 204, 21, 0.35)', body: '#facc15' },
    bump: { outline: 'rgba(163, 163, 163, 0.35)', body: '#a3a3a3' },
    patch: { outline: 'rgba(96, 165, 250, 0.35)', body: '#60a5fa' },
};

export function zoneColor(zone: 'landscape' | 'shoulder' | 'road', type: number): string {
    const table = zone === 'road' ? ROAD : zone === 'shoulder' ? SHOULDER : LANDSCAPE;
    return table[type - 1] ?? '#ff00ff';
}
