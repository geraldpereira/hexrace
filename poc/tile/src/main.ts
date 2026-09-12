import { drawTrackMap } from './map2d';
import type { Track } from './model';
import {
    closureError,
    environmentOf,
    overlapErrors,
    parseTrack,
    placeTrack,
    placedObstacleErrors,
    trackErrors,
    transitionOfExtent,
    validPrefix,
} from './model';
import { createView3d } from './view3d';

/** Les pistes sont des fichiers texte dans tracks/ ; Vite recharge la page quand l'un d'eux change. */
const files: Record<string, string> = import.meta.glob('../tracks/*.track', {
    query: '?raw',
    import: 'default',
    eager: true,
});

interface Entry {
    readonly file: string;
    readonly track: Track | null;
    readonly errors: string[];
}

const entries: Entry[] = Object.entries(files)
    .map(([path, text]) => ({ file: path.replace(/^.*\//, ''), ...parseTrack(text) }))
    .sort((a, b) => a.file.localeCompare(b.file));

const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
    app.innerHTML = `
        <div id="bar">
            <label>Piste <select id="track"></select></label>
            <label><input id="force" type="checkbox" /> Forcer la transition à <output id="extentValue">40</output> % de la tuile
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
    const force = app.querySelector<HTMLInputElement>('#force');
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
        !force ||
        !above ||
        !side
    ) {
        throw new Error('page incomplète');
    }

    const view = createView3d(gl);
    entries.forEach((entry, i) => {
        select.add(new Option(entry.track?.name ?? `${entry.file} (invalide)`, String(i)));
    });

    const show = (): void => {
        const entry = entries[Number(select.value)];
        if (!entry) return;
        window.location.hash = entry.track?.id ?? entry.file;
        if (!entry.track) {
            status.textContent = entry.errors.join(' ; ');
            status.style.color = '#fca5a5';
            return;
        }
        const track = entry.track;
        const environment = environmentOf(track.environment);
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
                ? `${track.mode} · ${environment.name} · ${track.tiles.length} tuiles · valide`
                : errors.join(' ; ');
        status.style.color = errors.length === 0 ? '#86efac' : '#fca5a5';
        extentValue.value = String(Math.round(Number(extent.value) * 100));
        const transition = force.checked
            ? transitionOfExtent(Number(extent.value))
            : environment.transition;
        drawTrackMap(map, placement, environment, transition);
        // La 3D ne construit que ce qui est valide : jusqu'à la première tuile qui en recouvre une autre.
        view.setPlacement(validPrefix(placement), environment, transition);
    };
    const fromHash = entries.findIndex(
        (entry) => `#${entry.track?.id ?? entry.file}` === window.location.hash,
    );
    if (fromHash >= 0) select.value = String(fromHash);
    select.addEventListener('change', show);
    extent.addEventListener('input', show);
    force.addEventListener('change', show);
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
