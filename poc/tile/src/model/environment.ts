import type { TransitionSpan } from './path';

/**
 * Un environnement (spec 2.2) : le thème d'une piste. Il fixe la palette de huit types de surface,
 * nommés par leur rang et ordonnés par adhérence décroissante (piste 1 la plus adhérente, piste 3
 * la plus glissante, paysage 2 celui qui peut être bloquant), leur apparence, et l'étendue de la
 * transition dans une tuile. Les grips viendront du POC 1 ; ici l'apparence est une couleur.
 */

export type EnvironmentId = 'north' | 'europe' | 'africa';

export const ENVIRONMENT_IDS: readonly EnvironmentId[] = ['north', 'europe', 'africa'];

export interface Environment {
    readonly id: EnvironmentId;
    readonly name: string;
    /** Couleur par rang : piste 1 à 3, bas-côté 1 à 3, paysage 1 à 2. */
    readonly colors: {
        readonly road: readonly [string, string, string];
        readonly shoulder: readonly [string, string, string];
        readonly landscape: readonly [string, string];
    };
    /** Fraction de l'axe sur laquelle largeur, position et types changent (spec 2.2). */
    readonly transition: TransitionSpan;
}

/** Transition sur toute la tuile, la recommandation du POC : des courbes régulières sans chicane. */
const FULL: TransitionSpan = { start: 0, end: 1 };

export const ENVIRONMENTS: Readonly<Record<EnvironmentId, Environment>> = {
    europe: {
        id: 'europe',
        name: 'Europe',
        colors: {
            road: ['#3f3f46', '#57534e', '#78716c'],
            shoulder: ['#a8a29e', '#84cc16', '#d6d3d1'],
            landscape: ['#4d7c0f', '#365314'],
        },
        transition: FULL,
    },
    north: {
        id: 'north',
        name: 'Pays du Nord',
        colors: {
            road: ['#94a3b8', '#cbd5e1', '#bae6fd'],
            shoulder: ['#e2e8f0', '#f1f5f9', '#7dd3fc'],
            landscape: ['#f8fafc', '#1e3a5f'],
        },
        transition: FULL,
    },
    africa: {
        id: 'africa',
        name: 'Afrique',
        colors: {
            road: ['#a16207', '#ca8a04', '#eab308'],
            shoulder: ['#d6d3d1', '#fde68a', '#fed7aa'],
            landscape: ['#b45309', '#78350f'],
        },
        transition: FULL,
    },
};

export function environmentOf(id: EnvironmentId): Environment {
    return ENVIRONMENTS[id];
}

export function isEnvironmentId(value: string): value is EnvironmentId {
    return (ENVIRONMENT_IDS as readonly string[]).includes(value);
}

/** Couleur d'une zone par son rang dans la palette ; magenta si le rang n'existe pas. */
export function zoneColor(
    environment: Environment,
    zone: 'landscape' | 'shoulder' | 'road',
    type: number,
): string {
    return environment.colors[zone][type - 1] ?? '#ff00ff';
}
