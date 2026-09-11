import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Obstacle, Placement, TransitionSpan, Vec2 } from './model';
import { SIDE, cellToWorld, hexCorners, obstacleFootprint, tilePolygons, tileSweep } from './model';
import { OBSTACLE, ROAD, zoneColor } from './palette';

/**
 * Vue three.js d'une piste posée : un maillage plat par zone, coloré par rang de palette, les
 * obstacles en volumes simples, une caméra libre pour inspecter les raccords. Le plan 2D (x, y)
 * devient (x, 0, -y) : le nord est vers -z.
 */

const HAZARD_HEIGHT = 1;
const BARRIER_HEIGHT = 0.8;
const FLAT_LIFT = 0.04;

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
        for (const placed of placement.tiles) {
            const sweep = tileSweep(placed, transition);
            for (const zone of tilePolygons(sweep)) {
                color.set(zoneColor(zone.zone, zone.type));
                triangulate(zone.points, 0, positions, colors, color);
            }
            for (const obstacle of placed.tile.obstacles ?? []) {
                group.add(obstacleMesh(sweep, obstacle));
            }
            const corners = hexCorners(cellToWorld(placed.cell));
            const line = new THREE.LineLoop(
                new THREE.BufferGeometry().setFromPoints(
                    corners.map((p) => new THREE.Vector3(p.x, FLAT_LIFT / 2, -p.y)),
                ),
                new THREE.LineBasicMaterial({ color: '#0c0a09' }),
            );
            edges.add(line);
            for (const c of corners) box.expandByPoint(new THREE.Vector3(c.x, 0, -c.y));
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.computeVertexNormals();
        group.add(
            new THREE.Mesh(
                geometry,
                new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
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

/** Triangule un polygone du plan et l'ajoute au maillage à la hauteur donnée, dans une couleur. */
function triangulate(
    points: Vec2[],
    height: number,
    positions: number[],
    colors: number[],
    color: THREE.Color,
): void {
    const contour = dedupe(points).map((p) => new THREE.Vector2(p.x, p.y));
    if (contour.length < 3) return;
    for (const triangle of THREE.ShapeUtils.triangulateShape(contour, [])) {
        for (const i of triangle) {
            const p = contour[i];
            if (!p) continue;
            positions.push(p.x, height, -p.y);
            colors.push(color.r, color.g, color.b);
        }
    }
}

function obstacleMesh(sweep: ReturnType<typeof tileSweep>, obstacle: Obstacle): THREE.Mesh {
    const { body } = obstacleFootprint(sweep, obstacle);
    const shape = new THREE.Shape(dedupe(body).map((p) => new THREE.Vector2(p.x, p.y)));
    const raised =
        obstacle.kind === 'hazard'
            ? HAZARD_HEIGHT
            : obstacle.kind === 'barrier'
              ? BARRIER_HEIGHT
              : 0;
    const geometry =
        raised > 0
            ? new THREE.ExtrudeGeometry(shape, { depth: raised, bevelEnabled: false })
            : new THREE.ShapeGeometry(shape);
    const fill =
        obstacle.kind === 'patch'
            ? (ROAD[obstacle.road - 1] ?? '#000')
            : OBSTACLE[obstacle.kind].body;
    const mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshLambertMaterial({ color: fill, side: THREE.DoubleSide }),
    );
    // La forme est dans le plan (x, y) et s'extrude vers +z ; on la couche : (x, y, z) → (x, z, -y).
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = raised > 0 ? 0 : FLAT_LIFT;
    return mesh;
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
