/**
 * Générateur pseudo-aléatoire déterministe : la même chaîne donne toujours la même suite. sfc32
 * initialisé par un hachage cyrb128 de la graine. Assez bon pour une piste, pas pour la crypto.
 */

export interface Rng {
    /** Un réel dans [0, 1). */
    next(): number;
    /** Un entier dans [0, n). */
    int(n: number): number;
    /** Vrai avec la probabilité p. */
    chance(p: number): boolean;
    /** Un élément au hasard, ou undefined si la liste est vide. */
    pick<T>(items: readonly T[]): T | undefined;
    /** Un élément tiré selon des poids positifs ; undefined si tous les poids sont nuls. */
    weighted<T>(items: readonly T[], weight: (item: T) => number): T | undefined;
    /** Une copie mélangée. */
    shuffle<T>(items: readonly T[]): T[];
}


export function createRng(seed: string): Rng {
    let [a, b, c, d] = cyrb128(seed);
    const next = (): number => {
        a |= 0;
        b |= 0;
        c |= 0;
        d |= 0;
        const t = (((a + b) | 0) + d) | 0;
        d = (d + 1) | 0;
        a = b ^ (b >>> 9);
        b = (c + (c << 3)) | 0;
        c = (c << 21) | (c >>> 11);
        c = (c + t) | 0;
        return (t >>> 0) / 4294967296;
    };
    const rng: Rng = {
        next,
        int: (n) => Math.floor(next() * n),
        chance: (p) => next() < p,
        pick: (items) => items[Math.floor(next() * items.length)],
        weighted: (items, weight) => {
            const weights = items.map((item) => Math.max(0, weight(item)));
            const total = weights.reduce((sum, w) => sum + w, 0);
            if (total <= 0) return undefined;
            let r = next() * total;
            for (let i = 0; i < items.length; i++) {
                r -= weights[i] ?? 0;
                if (r < 0) return items[i];
            }
            return items[items.length - 1];
        },
        shuffle: (items) => {
            const copy = [...items];
            for (let i = copy.length - 1; i > 0; i--) {
                const j = Math.floor(next() * (i + 1));
                const t = copy[i];
                const u = copy[j];
                if (t !== undefined && u !== undefined) {
                    copy[i] = u;
                    copy[j] = t;
                }
            }
            return copy;
        },
    };
    return rng;
}

function cyrb128(str: string): [number, number, number, number] {
    let h1 = 1779033703;
    let h2 = 3144134277;
    let h3 = 1013904242;
    let h4 = 2773480762;
    for (let i = 0; i < str.length; i++) {
        const k = str.charCodeAt(i);
        h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
        h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
        h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
        h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
}
