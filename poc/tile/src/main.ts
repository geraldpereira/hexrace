import { drawTrackMap } from './map2d';
import type { Track } from './model';
import {
    closureError,
    hexagone,
    ligne,
    overlapErrors,
    petitAnneau,
    placeTrack,
    recoupe,
    trackErrors,
    triangle,
} from './model';

const tracks: Track[] = [petitAnneau, triangle, hexagone, ligne, recoupe];

const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
    app.innerHTML = `
        <label>Piste <select id="track"></select></label>
        <p id="status"></p>
        <canvas id="map" width="900" height="600"></canvas>
    `;
    const select = app.querySelector<HTMLSelectElement>('#track');
    const status = app.querySelector<HTMLParagraphElement>('#status');
    const canvas = app.querySelector<HTMLCanvasElement>('#map');
    if (!select || !status || !canvas) throw new Error('page incomplète');

    tracks.forEach((track, i) => {
        select.add(new Option(track.name, String(i)));
    });

    const show = (): void => {
        const track = tracks[Number(select.value)];
        if (!track) return;
        const placement = placeTrack(track);
        const errors = [
            ...trackErrors(track),
            ...overlapErrors(placement),
            ...(closureError(track, placement) ? [closureError(track, placement) ?? ''] : []),
        ];
        status.textContent =
            errors.length === 0
                ? `${track.mode} · ${track.tiles.length} tuiles · valide`
                : errors.join(' ; ');
        status.style.color = errors.length === 0 ? '#86efac' : '#fca5a5';
        drawTrackMap(canvas, placement);
    };
    select.addEventListener('change', show);
    show();
}
