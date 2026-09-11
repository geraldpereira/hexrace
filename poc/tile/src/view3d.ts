import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Obstacle, Placement, TransitionSpan, Vec2 } from './model';
import {
    HEIGHT_UNIT,
    SIDE,
    cellToWorld,
    hexCorners,
    obstacleFootprint,
    tileBoundary,
    tileHeightAt,
    tilePolygons,
    tileSweep,
} from './model';
import type { TileSweep } from './model';
import { OBSTACLE, ROAD, zoneColor } from './palette';

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
    setPlacement(placement: Placement, transition?: TransitionSpan): void;
    setEdges(visible: boolean): void;
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
    scene.add(group, edges);

    const resize = (): void => {
        const { clientWidth, clientHeight } = canvas;
        renderer.setSize(clientWidth, clientHeight, false);
        camera.aspect = clientWidth / clientHeight;
        camera.updateProjectionMatrix();
    };

    const setPlacement = (placement: Placement, transition?: TransitionSpan): void => {
        scene.remove(group, edges);
        group = new THREE.Group();
        edges = new THREE.Group();
        edges.visible = edgesVisible;
        scene.add(group, edges);

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
            const heightAt = (p: Vec2): number => tileHeightAt(sweep, p);
            for (const zone of tilePolygons(sweep)) {
                color.set(zoneColor(zone.zone, zone.type));
                triangulate(zone.points, heightAt, positions, colors, color);
            }
            for (const obstacle of placed.tile.obstacles ?? []) {
                obstacleMesh(sweep, obstacle, heightAt, positions, colors);
            }
            color.set(SKIRT_COLOR);
            skirt(tileBoundary(sweep), heightAt, skirtBase, positions, colors, color);
            const corners = hexCorners(cellToWorld(placed.cell));
            const line = new THREE.LineLoop(
                new THREE.BufferGeometry().setFromPoints(
                    corners.map((p) => new THREE.Vector3(p.x, heightAt(p) + FLAT_LIFT / 2, -p.y)),
                ),
                new THREE.LineBasicMaterial({ color: '#0c0a09' }),
            );
            edges.add(line);
            for (const c of corners) box.expandByPoint(new THREE.Vector3(c.x, heightAt(c), -c.y));
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

        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const distance = Math.max(size.x, size.z, SIDE * 4) * 0.9;
        camera.position.set(center.x, distance * 0.8, center.z + distance * 0.8);
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
    return { setPlacement, setEdges, resize };
}

type HeightAt = (p: Vec2) => number;

/** Triangule un polygone du plan, chaque sommet à la hauteur du terrain plus `lift`, dans une couleur. */
function triangulate(
    points: Vec2[],
    heightAt: HeightAt,
    positions: number[],
    colors: number[],
    color: THREE.Color,
    lift = 0,
): void {
    const contour = dedupe(points);
    if (contour.length < 3) return;
    const shape = contour.map((p) => new THREE.Vector2(p.x, p.y));
    for (const triangle of THREE.ShapeUtils.triangulateShape(shape, [])) {
        for (const i of triangle) {
            const p = contour[i];
            if (!p) continue;
            positions.push(p.x, heightAt(p) + lift, -p.y);
            colors.push(color.r, color.g, color.b);
        }
    }
}

/** Un quadrilatère vertical entre deux points du sol et leur projection à `base`. */
function wall(
    a: Vec2,
    b: Vec2,
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
    outline: Vec2[],
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
 * descendent jusqu'au sol. Les objets à plat n'ont qu'une face, légèrement soulevée.
 */
function obstacleMesh(
    sweep: TileSweep,
    obstacle: Obstacle,
    heightAt: HeightAt,
    positions: number[],
    colors: number[],
): void {
    const body = dedupe(obstacleFootprint(sweep, obstacle).body);
    const raised =
        obstacle.kind === 'hazard'
            ? HAZARD_HEIGHT
            : obstacle.kind === 'barrier'
              ? BARRIER_HEIGHT
              : 0;
    const fill =
        obstacle.kind === 'patch'
            ? (ROAD[obstacle.road - 1] ?? '#000')
            : OBSTACLE[obstacle.kind].body;
    const color = new THREE.Color(fill);
    if (raised === 0) {
        triangulate(body, heightAt, positions, colors, color, FLAT_LIFT);
        return;
    }
    triangulate(body, heightAt, positions, colors, color, raised);
    const side = color.clone().multiplyScalar(0.7);
    for (let i = 0; i < body.length; i++) {
        const a = body[i];
        const b = body[(i + 1) % body.length];
        if (a && b) wall(a, b, (p) => heightAt(p) + raised, heightAt, positions, colors, side);
    }
}

/** Retire les points consécutifs confondus, qui font échouer la triangulation. */
function dedupe(points: Vec2[]): Vec2[] {
    const result: Vec2[] = [];
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
