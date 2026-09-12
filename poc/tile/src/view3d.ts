import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Environment, Obstacle, Placement, TransitionSpan } from './model';
import {
    HEIGHT_UNIT,
    SIDE,
    cellToWorld,
    heightOf,
    hexCorners,
    obstacleFootprint,
    tileBoundary,
    tileHeightAt,
    tileQuads,
    tileSweep,
    zoneColor,
} from './model';
import type { SPoint, TileSweep } from './model';
import { OBSTACLE } from './palette';

/**
 * Vue three.js d'une piste posée : un maillage plat par zone, coloré par rang de palette, les
 * obstacles en volumes simples, une caméra libre pour inspecter les raccords. Le plan 2D (x, y)
 * devient (x, 0, -y) : le nord est vers -z.
 */

const HAZARD_HEIGHT = 1;
const BARRIER_HEIGHT = 0.8;
const FLAT_LIFT = 0.04;
/** Les jupes descendent sous la tuile la plus basse de cette hauteur. */
const SKIRT_DEPTH = 2 * HEIGHT_UNIT;
const SKIRT_COLOR = '#292524';

export interface View3d {
    setPlacement(
        placement: Placement,
        environment: Environment,
        transition?: TransitionSpan,
        faulty?: ReadonlySet<number>,
    ): void;
    setEdges(visible: boolean): void;
    /** Caméra en hauteur au sud de la piste, ou au ras du sol à l'est pour lire le relief de profil. */
    lookFrom(where: 'above' | 'side'): void;
    resize(): void;
}

export function createView3d(canvas: HTMLCanvasElement): View3d {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#1c1917');
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2000);
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    scene.add(new THREE.HemisphereLight('#e7e5e4', '#3f3f46', 1.2));
    const sun = new THREE.DirectionalLight('#fff7ed', 1.4);
    sun.position.set(60, 100, 40);
    scene.add(sun);

    let group = new THREE.Group();
    let edges = new THREE.Group();
    let marks = new THREE.Group();
    scene.add(group, edges, marks);

    const resize = (): void => {
        const { clientWidth, clientHeight } = canvas;
        renderer.setSize(clientWidth, clientHeight, false);
        camera.aspect = clientWidth / clientHeight;
        camera.updateProjectionMatrix();
    };

    const setPlacement = (
        placement: Placement,
        environment: Environment,
        transition?: TransitionSpan,
        faulty: ReadonlySet<number> = new Set(),
    ): void => {
        scene.remove(group, edges, marks);
        group = new THREE.Group();
        edges = new THREE.Group();
        marks = new THREE.Group();
        edges.visible = edgesVisible;
        scene.add(group, edges, marks);

        const positions: number[] = [];
        const colors: number[] = [];
        const color = new THREE.Color();
        const box = new THREE.Box3();
        const lowest = Math.min(
            ...placement.tiles.map((t) => Math.min(t.entry.height, t.tile.profile.height)),
        );
        const skirtBase = lowest * HEIGHT_UNIT - SKIRT_DEPTH;
        for (const placed of placement.tiles) {
            const sweep = tileSweep(placed, transition);
            const heightAt = (p: SPoint): number => heightOf(sweep, p);
            for (const quad of tileQuads(sweep)) {
                color.set(zoneColor(environment, quad.zone, quad.type));
                fan(quad.points, heightAt, positions, colors, color);
            }
            for (const obstacle of placed.tile.obstacles ?? []) {
                obstacleMesh(sweep, obstacle, environment, heightAt, positions, colors);
            }
            color.set(SKIRT_COLOR);
            skirt(tileBoundary(sweep), heightAt, skirtBase, positions, colors, color);
            const corners = hexCorners(cellToWorld(placed.cell));
            const line = new THREE.LineLoop(
                new THREE.BufferGeometry().setFromPoints(
                    corners.map(
                        (p) => new THREE.Vector3(p.x, tileHeightAt(sweep, p) + FLAT_LIFT / 2, -p.y),
                    ),
                ),
                new THREE.LineBasicMaterial({ color: '#0c0a09' }),
            );
            edges.add(line);
            if (faulty.has(placed.index)) {
                const mark = new THREE.LineLoop(
                    new THREE.BufferGeometry().setFromPoints(
                        corners.map(
                            (p) => new THREE.Vector3(p.x, tileHeightAt(sweep, p) + 0.3, -p.y),
                        ),
                    ),
                    new THREE.LineBasicMaterial({ color: '#ef4444' }),
                );
                marks.add(mark);
            }
            for (const c of corners)
                box.expandByPoint(new THREE.Vector3(c.x, tileHeightAt(sweep, c), -c.y));
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.computeVertexNormals();
        group.add(
            new THREE.Mesh(
                geometry,
                new THREE.MeshLambertMaterial({
                    vertexColors: true,
                    flatShading: true,
                    side: THREE.DoubleSide,
                }),
            ),
        );

        bounds.copy(box);
        lookFrom('above');
    };

    const bounds = new THREE.Box3();
    const lookFrom = (where: 'above' | 'side'): void => {
        const center = bounds.getCenter(new THREE.Vector3());
        const size = bounds.getSize(new THREE.Vector3());
        const distance = Math.max(size.x, size.z, SIDE * 4) * 0.9;
        if (where === 'above')
            camera.position.set(center.x, distance * 0.8, center.z + distance * 0.8);
        else camera.position.set(center.x + distance * 1.1, center.y + distance * 0.12, center.z);
        controls.target.copy(center);
        controls.update();
    };

    let edgesVisible = false;
    const setEdges = (visible: boolean): void => {
        edgesVisible = visible;
        edges.visible = visible;
    };

    const loop = (): void => {
        controls.update();
        renderer.render(scene, camera);
        requestAnimationFrame(loop);
    };
    resize();
    loop();
    return { setPlacement, setEdges, lookFrom, resize };
}

type HeightAt = (p: SPoint) => number;

/**
 * Un polygone convexe en éventail depuis son premier sommet, chaque sommet à la hauteur de son
 * avancement plus `lift`. Les quadrilatères de zones et les emprises d'obstacles sont convexes ou
 * presque ; une bande qui suit un virage est découpée en quadrilatères par la fonction appelante.
 */
function fan(
    points: SPoint[],
    heightAt: HeightAt,
    positions: number[],
    colors: number[],
    color: THREE.Color,
    lift = 0,
): void {
    const contour = dedupe(points);
    if (contour.length < 3) return;
    const first = contour[0];
    if (!first) return;
    for (let i = 1; i + 1 < contour.length; i++) {
        const b = contour[i];
        const c = contour[i + 1];
        if (!b || !c) continue;
        for (const p of [first, b, c]) {
            positions.push(p.x, heightAt(p) + lift, -p.y);
            colors.push(color.r, color.g, color.b);
        }
    }
}

/** Une bande (bord gauche à l'aller, bord droit au retour) découpée en quadrilatères entre échantillons voisins. */
function bandQuads(points: SPoint[]): SPoint[][] {
    const n = points.length / 2;
    const quads: SPoint[][] = [];
    for (let i = 0; i + 1 < n; i++) {
        const a = points[i];
        const b = points[i + 1];
        const c = points[2 * n - 2 - i];
        const d = points[2 * n - 1 - i];
        if (a && b && c && d) quads.push([a, b, c, d]);
    }
    return quads;
}

/** Un quadrilatère vertical entre deux points du sol et leur projection à `base`. */
function wall(
    a: SPoint,
    b: SPoint,
    top: HeightAt,
    base: HeightAt,
    positions: number[],
    colors: number[],
    color: THREE.Color,
): void {
    const quad = [
        [a.x, top(a), -a.y],
        [b.x, top(b), -b.y],
        [b.x, base(b), -b.y],
        [a.x, base(a), -a.y],
    ] as const;
    for (const i of [0, 1, 2, 0, 2, 3]) {
        const v = quad[i];
        if (v) positions.push(...v);
        colors.push(color.r, color.g, color.b);
    }
}

/** Les jupes : le contour de la tuile descendu jusqu'à `base`. */
function skirt(
    outline: SPoint[],
    heightAt: HeightAt,
    base: number,
    positions: number[],
    colors: number[],
    color: THREE.Color,
): void {
    for (let i = 0; i < outline.length; i++) {
        const a = outline[i];
        const b = outline[(i + 1) % outline.length];
        if (a && b) wall(a, b, heightAt, () => base, positions, colors, color);
    }
}

/**
 * Un obstacle en volume : sa face du dessus suit le terrain à `raised` au-dessus, ses flancs
 * descendent jusqu'au sol. Les objets à plat n'ont qu'une face, légèrement soulevée. Un hazard est
 * un rectangle de niveau ; une bande suit la piste et se découpe en quadrilatères.
 */
function obstacleMesh(
    sweep: TileSweep,
    obstacle: Obstacle,
    environment: Environment,
    heightAt: HeightAt,
    positions: number[],
    colors: number[],
): void {
    const body = obstacleFootprint(sweep, obstacle).body;
    const raised =
        obstacle.kind === 'hazard'
            ? HAZARD_HEIGHT
            : obstacle.kind === 'barrier'
              ? BARRIER_HEIGHT
              : 0;
    const fill =
        obstacle.kind === 'patch'
            ? zoneColor(environment, 'road', obstacle.road)
            : OBSTACLE[obstacle.kind].body;
    const color = new THREE.Color(fill);
    const pieces = obstacle.kind === 'hazard' ? [body] : bandQuads(body);
    for (const piece of pieces)
        fan(piece, heightAt, positions, colors, color, raised > 0 ? raised : FLAT_LIFT);
    if (raised === 0) return;
    const side = color.clone().multiplyScalar(0.7);
    const outline = dedupe(body);
    for (let i = 0; i < outline.length; i++) {
        const a = outline[i];
        const b = outline[(i + 1) % outline.length];
        if (a && b) wall(a, b, (p) => heightAt(p) + raised, heightAt, positions, colors, side);
    }
}

/** Retire les points consécutifs confondus, qui font échouer la triangulation. */
function dedupe(points: SPoint[]): SPoint[] {
    const result: SPoint[] = [];
    for (const p of points) {
        const last = result[result.length - 1];
        if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 1e-6) result.push(p);
    }
    const first = result[0];
    const last = result[result.length - 1];
    if (
        result.length > 1 &&
        first &&
        last &&
        Math.hypot(first.x - last.x, first.y - last.y) <= 1e-6
    )
        result.pop();
    return result;
}
