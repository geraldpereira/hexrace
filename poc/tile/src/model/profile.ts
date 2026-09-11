/**
 * Le profil d'une face (spec 2.1) : de gauche à droite, du paysage, éventuellement un bas-côté,
 * la piste, éventuellement un bas-côté, du paysage. Tout se compte en unités, une unité étant une
 * largeur de voiture, et une face fait huit unités.
 *
 * Les types de revêtement sont des indices dans la palette de l'environnement (spec 2.2) : la
 * « piste 2 » d'Europe et la « piste 2 » d'Afrique sont des revêtements différents à la même place.
 */

export const FACE_WIDTH = 8;
export const MIN_ROAD_WIDTH = 1;
export const MAX_ROAD_WIDTH = 5;
/** Piste plus bas-côtés, de sorte qu'il reste au moins une unité de paysage de chaque côté. */
export const MAX_BLOCK_WIDTH = 6;
export const MIN_LANDSCAPE_WIDTH = 1;
export const MIN_HEIGHT = 1;
export const MAX_HEIGHT = 20;

export type RoadType = 1 | 2 | 3;
export type ShoulderType = 1 | 2 | 3;
export type LandscapeType = 1 | 2;
export type ShoulderWidth = 0 | 1;

export interface Profile {
    /** Première unité de piste, comptée depuis la gauche de la face, à partir de 0 (croquis 3). */
    readonly position: number;
    /** Largeur de la piste, de 1 à 5 unités. */
    readonly roadWidth: number;
    /** Bas-côté gauche, 0 ou 1 unité. */
    readonly leftShoulder: ShoulderWidth;
    /** Bas-côté droit, 0 ou 1 unité. */
    readonly rightShoulder: ShoulderWidth;
    /** Hauteur entière de la face, de 1 à 20. */
    readonly height: number;
    readonly road: RoadType;
    readonly shoulder: ShoulderType;
    readonly landscape: LandscapeType;
}

/** Première unité du bloc piste plus bas-côtés. */
export function blockStart(profile: Profile): number {
    return profile.position - profile.leftShoulder;
}

/** Unité qui suit le bloc piste plus bas-côtés (borne exclue). */
export function blockEnd(profile: Profile): number {
    return profile.position + profile.roadWidth + profile.rightShoulder;
}

export function blockWidth(profile: Profile): number {
    return blockEnd(profile) - blockStart(profile);
}

/** Ce qu'on trouve à une unité donnée de la face, de gauche à droite. */
export type Zone = 'landscape' | 'shoulder' | 'road';

export function zoneAt(profile: Profile, unit: number): Zone {
    if (unit >= profile.position && unit < profile.position + profile.roadWidth) return 'road';
    if (unit >= blockStart(profile) && unit < blockEnd(profile)) return 'shoulder';
    return 'landscape';
}

/** Les huit unités de la face, de gauche à droite. */
export function zones(profile: Profile): Zone[] {
    return Array.from({ length: FACE_WIDTH }, (_, unit) => zoneAt(profile, unit));
}

/** Les invariants de la spec 2.1 qui ne tiennent pas, en clair. Vide si le profil est valide. */
export function profileErrors(profile: Profile): string[] {
    const errors: string[] = [];
    const { position, roadWidth, height } = profile;
    if (!Number.isInteger(roadWidth) || roadWidth < MIN_ROAD_WIDTH || roadWidth > MAX_ROAD_WIDTH) {
        errors.push(
            `piste de ${roadWidth} unités, attendu de ${MIN_ROAD_WIDTH} à ${MAX_ROAD_WIDTH}`,
        );
    }
    if (blockWidth(profile) > MAX_BLOCK_WIDTH) {
        errors.push(
            `piste plus bas-côtés font ${blockWidth(profile)} unités, au plus ${MAX_BLOCK_WIDTH}`,
        );
    }
    if (!Number.isInteger(position)) {
        errors.push(`position ${position} non entière`);
    } else {
        if (blockStart(profile) < MIN_LANDSCAPE_WIDTH) {
            errors.push(
                `pas de paysage à gauche : le bloc commence à l'unité ${blockStart(profile)}`,
            );
        }
        if (blockEnd(profile) > FACE_WIDTH - MIN_LANDSCAPE_WIDTH) {
            errors.push(`pas de paysage à droite : le bloc finit à l'unité ${blockEnd(profile)}`);
        }
    }
    if (!Number.isInteger(height) || height < MIN_HEIGHT || height > MAX_HEIGHT) {
        errors.push(`hauteur ${height}, attendu un entier de ${MIN_HEIGHT} à ${MAX_HEIGHT}`);
    }
    return errors;
}

export function isValidProfile(profile: Profile): boolean {
    return profileErrors(profile).length === 0;
}

/** Deux profils identiques en tout point : la condition de raccord de la spec 2.6. */
export function sameProfile(a: Profile, b: Profile): boolean {
    return (
        a.position === b.position &&
        a.roadWidth === b.roadWidth &&
        a.leftShoulder === b.leftShoulder &&
        a.rightShoulder === b.rightShoulder &&
        a.height === b.height &&
        a.road === b.road &&
        a.shoulder === b.shoulder &&
        a.landscape === b.landscape
    );
}
