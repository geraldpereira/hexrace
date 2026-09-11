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
    placedObstacleErrors,
    recoupe,
    relief,
    trackErrors,
    transitionOfExtent,
    triangle,
    validPrefix,
} from './model';
import { createView3d } from './view3d';

const tracks: Track[] = [
    petitAnneau,
    triangle,
    hexagone,
    ligne,
    relief,
    recoupe,
    courbes,
    catalogue,
];

const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
    app.innerHTML = `
        <div id="bar">
            <label>Piste <select id="track"></select></label>
            <label>Transition sur <output id="extentValue">40</output> % de la tuile
                <input id="extent" type="range" min="0.2" max="1" step="0.1" value="0.4" style="vertical-align:middle" /></label>
            <label><input id="edges" type="checkbox" /> Contours des tuiles</label>
            <label><input id="showMap" type="checkbox" checked /> Carte 2D</label>
            <span>Vue <button id="above" type="button">Dessus</button> <button id="side" type="button">Profil</button></span>
            <p id="status"></p>
        </div>
        <div id="stage">
            <canvas id="gl"></canvas>
            <canvas id="map" width="720" height="480"></canvas>
        </div>
    `;
    const select = app.querySelector<HTMLSelectElement>('#track');
    const status = app.querySelector<HTMLParagraphElement>('#status');
    const map = app.querySelector<HTMLCanvasElement>('#map');
    const gl = app.querySelector<HTMLCanvasElement>('#gl');
    const extent = app.querySelector<HTMLInputElement>('#extent');
    const extentValue = app.querySelector<HTMLOutputElement>('#extentValue');
    const edges = app.querySelector<HTMLInputElement>('#edges');
    const showMap = app.querySelector<HTMLInputElement>('#showMap');
    const above = app.querySelector<HTMLButtonElement>('#above');
    const side = app.querySelector<HTMLButtonElement>('#side');
    if (
        !select ||
        !status ||
        !map ||
        !gl ||
        !extent ||
        !extentValue ||
        !edges ||
        !showMap ||
        !above ||
        !side
    ) {
        throw new Error('page incomplète');
    }

    const view = createView3d(gl);
    tracks.forEach((track, i) => {
        select.add(new Option(track.name, String(i)));
    });

    const show = (): void => {
        const track = tracks[Number(select.value)];
        if (!track) return;
        window.location.hash = track.id;
        const placement = placeTrack(track);
        const closure = closureError(track, placement);
        const errors = [
            ...trackErrors(track),
            ...overlapErrors(placement),
            ...placedObstacleErrors(placement),
            ...(closure ? [closure] : []),
        ];
        status.textContent =
            errors.length === 0
                ? `${track.mode} · ${track.tiles.length} tuiles · valide`
                : errors.join(' ; ');
        status.style.color = errors.length === 0 ? '#86efac' : '#fca5a5';
        extentValue.value = String(Math.round(Number(extent.value) * 100));
        const transition = transitionOfExtent(Number(extent.value));
        drawTrackMap(map, placement, transition);
        // La 3D ne construit que ce qui est valide : jusqu'à la première tuile qui en recouvre une autre.
        view.setPlacement(validPrefix(placement), transition);
    };
    const fromHash = tracks.findIndex((track) => `#${track.id}` === window.location.hash);
    if (fromHash >= 0) select.value = String(fromHash);
    select.addEventListener('change', show);
    extent.addEventListener('input', show);
    edges.addEventListener('change', () => {
        view.setEdges(edges.checked);
    });
    showMap.addEventListener('change', () => {
        map.hidden = !showMap.checked;
    });
    above.addEventListener('click', () => {
        view.lookFrom('above');
    });
    side.addEventListener('click', () => {
        view.lookFrom('side');
    });
    window.addEventListener('resize', () => {
        view.resize();
    });
    show();
}
