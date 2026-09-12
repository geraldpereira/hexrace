import { mkdirSync, writeFileSync } from 'node:fs';
import { catalogue } from '../src/model/fixtures/catalogue';
import { courbes } from '../src/model/fixtures/courbes';
import { petitAnneau } from '../src/model/fixtures/petitAnneau';
import { hexagone, ligne, recoupe, relief, triangle } from '../src/model/fixtures/petitesBoucles';
import { environmentOf } from '../src/model/environment';
import { serializeTrack } from '../src/model/trackFile';

/** Écrit les fixtures TypeScript en fichiers tracks/*.track ; `npm run tracks`. */
mkdirSync('tracks', { recursive: true });
for (const track of [petitAnneau, triangle, hexagone, ligne, relief, recoupe, courbes, catalogue]) {
    const path = `tracks/${track.id}.track`;
    writeFileSync(path, serializeTrack(track, environmentOf(track.environment)));
    console.log(path);
}
