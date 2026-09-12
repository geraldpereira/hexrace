import { drawTrackMap } from './map2d';
import type { Environment, LineMark, Placement, Track, TransitionSpan } from './model';
import {
    DEFAULT_CONFIG,
    environmentOf,
    formatConfig,
    formatIssue,
    generateTrack,
    lineMarks,
    parseConfig,
    playerPose,
    windowIndices,
    cursorAt,
    isClosed,
    parseTrack,
    serializeTrack,
    transitionOfExtent,
    validPrefix,
    validateTrack,
    pathLength,
    UNIT_METERS,
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
            <label><input id="smooth" type="checkbox" /> Lissage</label>
            <label><input id="showMap" type="checkbox" checked /> Carte 2D</label>
            <span>Vue <button id="above" type="button">Dessus</button> <button id="side" type="button">Profil</button>
                <label>Tuile <input id="focus" type="number" min="0" value="0" style="width: 4em" /></label></span>
            <label>Graine <input id="config" size="36" spellcheck="false" /></label>
            <button id="generate" type="button">Générer</button>
            <span style="flex-basis: 100%; display: flex; gap: 16px; align-items: center; flex-wrap: wrap">
                <label><input id="windowOn" type="checkbox" /> Fenêtre</label>
                <label>devant <input id="ahead" type="number" min="0" max="20" value="3" style="width: 3.5em" /></label>
                <label>derrière <input id="behind" type="number" min="0" max="20" value="1" style="width: 3.5em" /></label>
                <label>Position <input id="position" type="range" min="0" max="1" step="0.01" value="0" style="width: 240px; vertical-align: middle" /> <output id="positionValue">0.00</output></label>
                <label>Vitesse <input id="speed" type="range" min="0" max="200" step="5" value="80" style="width: 120px; vertical-align: middle" /> <output id="speedValue">80</output> km/h</label>
                <label><input id="drive" type="checkbox" /> Avance</label>
                <button id="playerView" type="button">Vue joueur</button>
            </span>
            <details id="filePanel" style="flex-basis: 100%">
                <summary>Fichier de la piste affichée</summary>
                <textarea id="file" readonly rows="14" style="width: 100%; font: 12px/1.3 monospace; background: #0c0a09; color: #e7e5e4; border: 1px solid #44403c"></textarea>
            </details>
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
    const smooth = app.querySelector<HTMLInputElement>('#smooth');
    const showMap = app.querySelector<HTMLInputElement>('#showMap');
    const force = app.querySelector<HTMLInputElement>('#force');
    const above = app.querySelector<HTMLButtonElement>('#above');
    const side = app.querySelector<HTMLButtonElement>('#side');
    const focus = app.querySelector<HTMLInputElement>('#focus');
    const windowOn = app.querySelector<HTMLInputElement>('#windowOn');
    const ahead = app.querySelector<HTMLInputElement>('#ahead');
    const behind = app.querySelector<HTMLInputElement>('#behind');
    const position = app.querySelector<HTMLInputElement>('#position');
    const positionValue = app.querySelector<HTMLOutputElement>('#positionValue');
    const speed = app.querySelector<HTMLInputElement>('#speed');
    const speedValue = app.querySelector<HTMLOutputElement>('#speedValue');
    const drive = app.querySelector<HTMLInputElement>('#drive');
    const playerView = app.querySelector<HTMLButtonElement>('#playerView');
    const config = app.querySelector<HTMLInputElement>('#config');
    const generate = app.querySelector<HTMLButtonElement>('#generate');
    const file = app.querySelector<HTMLTextAreaElement>('#file');
    if (
        !select ||
        !status ||
        !map ||
        !gl ||
        !extent ||
        !extentValue ||
        !edges ||
        !smooth ||
        !showMap ||
        !force ||
        !above ||
        !side ||
        !config ||
        !generate ||
        !file ||
        !focus ||
        !windowOn ||
        !ahead ||
        !behind ||
        !position ||
        !positionValue ||
        !speed ||
        !speedValue ||
        !drive ||
        !playerView
    ) {
        throw new Error('page incomplète');
    }

    const view = createView3d(gl);
    entries.forEach((entry, i) => {
        select.add(new Option(entry.track?.name ?? `${entry.file} (invalide)`, String(i)));
    });

    /** La piste générée occupe la dernière option du sélecteur ; sa chaîne de configuration va dans l'URL. */
    const GENERATED = entries.length;
    select.add(new Option('Générée', String(GENERATED)));
    let generatedConfig = formatConfig(DEFAULT_CONFIG);
    config.value = generatedConfig;
    const regenerate = (): boolean => {
        const parsed = parseConfig(config.value);
        if (!parsed) {
            status.textContent = `chaîne de génération invalide : « ${config.value} », attendu par exemple ${formatConfig(DEFAULT_CONFIG)}`;
            status.style.color = '#fca5a5';
            return false;
        }
        generatedConfig = formatConfig(parsed);
        config.value = generatedConfig;
        entries[GENERATED] = { file: 'générée', track: generateTrack(parsed), errors: [] };
        return true;
    };
    regenerate();

    let current: {
        track: Track;
        placement: Placement;
        environment: Environment;
        transition: TransitionSpan;
        faulty: ReadonlySet<number>;
        marks: LineMark[];
    } | null = null;
    let following = false;

    /** Applique la fenêtre et la position du joueur aux deux vues, sans reconstruire les maillages. */
    const updateWindow = (): void => {
        if (!current) return;
        const { track, placement, environment, transition, faulty, marks } = current;
        const total = placement.tiles.length;
        position.max = String(isClosed(track) ? total : Math.max(0, total - 0.01));
        const pos = Number(position.value);
        positionValue.value = pos.toFixed(2);
        speedValue.value = speed.value;
        const cursor = cursorAt(pos, total, isClosed(track));
        const indices = windowOn.checked
            ? windowIndices(
                  total,
                  cursor.tile,
                  Number(ahead.value),
                  Number(behind.value),
                  isClosed(track),
              )
            : null;
        view.setWindow(indices);
        const pose = playerPose(track, placement, pos);
        if (pose && following) view.followPlayer(pose, Number(speed.value));
        drawTrackMap(map, placement, environment, transition, faulty, marks, indices, pose);
    };

    const show = (): void => {
        const entry = entries[Number(select.value)];
        if (!entry) return;
        window.location.hash =
            Number(select.value) === GENERATED ? generatedConfig : (entry.track?.id ?? entry.file);
        file.value = entry.track
            ? serializeTrack(entry.track, environmentOf(entry.track.environment))
            : '';
        if (!entry.track) {
            status.textContent = entry.errors.join(' ; ');
            status.style.color = '#fca5a5';
            return;
        }
        const track = entry.track;
        const environment = environmentOf(track.environment);
        const { placement, issues, faulty } = validateTrack(track);
        status.textContent =
            issues.length === 0
                ? `${track.mode} · ${environment.name} · ${track.tiles.length} tuiles · valide`
                : issues.map(formatIssue).join(' ; ');
        status.style.color = issues.length === 0 ? '#86efac' : '#fca5a5';
        extentValue.value = String(Math.round(Number(extent.value) * 100));
        const transition = force.checked
            ? transitionOfExtent(Number(extent.value))
            : environment.transition;
        const marks = lineMarks(track);
        // La 3D ne construit que ce qui est valide : jusqu'à la première tuile qui en recouvre une autre.
        const shown = validPrefix(placement);
        view.setPlacement(shown, environment, transition, faulty, marks);
        current = { track, placement: shown, environment, transition, faulty, marks };
        following = false;
        updateWindow();
    };
    const hash = decodeURIComponent(window.location.hash.slice(1));
    const fromHash = entries.findIndex(
        (entry, i) => i !== GENERATED && (entry.track?.id ?? entry.file) === hash,
    );
    if (fromHash >= 0) select.value = String(fromHash);
    else if (parseConfig(hash)) {
        config.value = hash;
        regenerate();
        select.value = String(GENERATED);
    }
    focus.addEventListener('change', () => {
        following = false;
        view.focusTile(Number(focus.value));
    });
    for (const input of [windowOn, ahead, behind, position, speed]) {
        input.addEventListener('input', updateWindow);
    }
    playerView.addEventListener('click', () => {
        following = true;
        updateWindow();
    });
    above.addEventListener('click', () => {
        following = false;
    });
    side.addEventListener('click', () => {
        following = false;
    });
    // Avance automatique : la vitesse en km/h convertie en unités par seconde (une unité = 1,7 m).
    let lastTick = performance.now();
    const tick = (now: number): void => {
        const dt = (now - lastTick) / 1000;
        lastTick = now;
        if (drive.checked && current) {
            const unitsPerSecond = (Number(speed.value) * 1000) / 3600 / UNIT_METERS;
            const tile =
                current.placement.tiles[
                    cursorAt(
                        Number(position.value),
                        current.placement.tiles.length,
                        isClosed(current.track),
                    ).tile
                ];
            const length = tile ? pathLength(tile.tile.exit) : 1;
            let next = Number(position.value) + (unitsPerSecond * dt) / length;
            const max = Number(position.max);
            if (next > max) next = isClosed(current.track) ? next - max : max;
            position.value = String(next);
            updateWindow();
        }
        requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    generate.addEventListener('click', () => {
        if (regenerate()) {
            select.value = String(GENERATED);
            show();
        }
    });
    config.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') generate.click();
    });
    select.addEventListener('change', show);
    extent.addEventListener('input', show);
    force.addEventListener('change', show);
    edges.addEventListener('change', () => {
        view.setEdges(edges.checked);
    });
    smooth.addEventListener('change', () => {
        view.setSmooth(smooth.checked);
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
