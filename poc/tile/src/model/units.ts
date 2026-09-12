/**
 * Les unités du monde (spec 2.1 et 2.3). Les longueurs se comptent en largeurs de voiture ; les
 * hauteurs en pas de 20 cm, indépendants de la voiture. Pour passer de l'un à l'autre il faut la
 * largeur de voiture en mètres, posée à 1,7 m pour fixer les idées (la caisse du POC voiture fait
 * 1,6 m) ; à confirmer au POC 3.
 */

/** Une unité de longueur, en mètres. */
export const UNIT_METERS = 1.7;
/** Un pas de hauteur, en mètres. */
export const HEIGHT_STEP_METERS = 0.2;
/** Un pas de hauteur, en unités de longueur du monde. */
export const HEIGHT_UNIT = HEIGHT_STEP_METERS / UNIT_METERS;
/** Amplitude maximale d'une piste, en pas : 200 m. */
export const MAX_AMPLITUDE_STEPS = 1000;
/** La jupe descend sous le point le plus bas de la piste de cette profondeur, en mètres (spec 2.7). */
export const SKIRT_DEPTH_METERS = 2;

export function metersToUnits(meters: number): number {
    return meters / UNIT_METERS;
}

export function stepsToUnits(steps: number): number {
    return steps * HEIGHT_UNIT;
}
