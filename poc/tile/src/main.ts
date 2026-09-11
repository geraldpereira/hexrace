import { drawTrackMap } from './map2d';
import type { Track } from './model';
import {
    catalogue,
    closureError,
    courbes,
    hexagone,
    ligne,
    overlapErrors,
    petitAnneau,
    placeTrack,
    recoupe,
    trackErrors,
    transitionOfExtent,
    triangle,
} from './model';

const tracks: Track[] = [petitAnneau, triangle, hexagone, ligne, recoupe, courbes, catalogue];

const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
    app.innerHTML = `
        <label>Piste <select id="track"></select></label>
        <label style="margin-left:24px">Transition sur <output id="extentValue">40</output> % de la tuile
            <input id="extent" type="range" min="0.2" max="1" step="0.1" value="0.4" style="vertical-align:middle" /></label>
        <p id="status"></p>
        <canvas id="map"></canvas>
    `;
    const select = app.querySelector<HTMLSelectElement>('#track');
    const status = app.querySelector<HTMLParagraphElement>('#status');
    const canvas = app.querySelector<HTMLCanvasElement>('#map');
    const extent = app.querySelector<HTMLInputElement>('#extent');
    const extentValue = app.querySelector<HTMLOutputElement>('#extentValue');
    if (!select || !status || !canvas || !extent || !extentValue) {
        throw new Error('page incomplète');
    }

    tracks.forEach((track, i) => {
        select.add(new Option(track.name, String(i)));
    });

    const show = (): void => {
        const track = tracks[Number(select.value)];
        if (!track) return;
        canvas.width = window.innerWidth - 32;
        canvas.height = window.innerHeight - 90;
        window.location.hash = track.id;
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
        extentValue.value = String(Math.round(Number(extent.value) * 100));
        drawTrackMap(canvas, placement, transitionOfExtent(Number(extent.value)));
    };
    const fromHash = tracks.findIndex((track) => `#${track.id}` === window.location.hash);
    if (fromHash >= 0) select.value = String(fromHash);
    select.addEventListener('change', show);
    extent.addEventListener('input', show);
    window.addEventListener('resize', show);
    show();
}
