import * as THREE from 'three';
import type GUI from 'lil-gui';
import type initJolt from 'jolt-physics';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';
import { Component, GameObject } from '../../engine/gameObject';
import { LAYER_NON_MOVING, type Physics } from '../../engine/physics';
import { TerrainData } from './terrain';

type JoltAPI = Awaited<ReturnType<typeof initJolt>>;
type JoltBody = InstanceType<JoltAPI['Body']>;

// Ramp: a wedge across the track, low end first in the driving direction.
const RAMP_LENGTH = 7;
const RAMP_HEIGHT = 1.1;
// Speed bump: a cylinder lying across the track, sunk so only the top shows.
const BUMP_RADIUS = 0.3;
const BUMP_HEIGHT = 0.2;
// Same friction as the terrain so the wheels behave as on the track.
const FRICTION = 1;
// Where to look for straight bits: skip the start, keep the two apart.
const CURVE_SAMPLES = 256;
const T_MIN = 0.08;
const T_MAX = 0.95;
const MIN_SEPARATION = 0.2;

interface Placed {
    body: JoltBody;
    mesh: THREE.Mesh;
}

/**
 * Two test obstacles on the track for the suspension: a ramp to jump from
 * and a speed bump to thump over. Both are static Jolt bodies with matching
 * meshes, placed on the straightest stretches of the loop. Rebuilt from the
 * debug panel when their size changes.
 */
export class ObstaclesBehavior extends Component {
    rampEnabled = true;
    rampLength = RAMP_LENGTH;
    rampHeight = RAMP_HEIGHT;
    bumpEnabled = true;
    bumpRadius = BUMP_RADIUS;
    bumpHeight = BUMP_HEIGHT;
    /** Curve parameters where the ramp and the bump sit, debug readouts. */
    rampT = 0;
    bumpT = 0;

    private terrain!: TerrainData;
    private placed: Placed[] = [];

    constructor(
        private readonly physics: Physics,
        private readonly scene: THREE.Scene,
    ) {
        super();
    }

    override start(): void {
        const terrain = this.gameObject.findInScene(TerrainData);
        if (!terrain) throw new Error('ObstaclesBehavior: no TerrainData in scene');
        this.terrain = terrain;
        [this.rampT, this.bumpT] = this.straightestSpots();
        this.rebuild();
    }

    override onDestroy(): void {
        this.clear();
    }

    rebuild(): void {
        this.clear();
        if (this.rampEnabled) this.placed.push(this.buildRamp(this.rampT));
        if (this.bumpEnabled) this.placed.push(this.buildBump(this.bumpT));
    }

    private clear(): void {
        const bi = this.physics.bodyInterface;
        for (const p of this.placed) {
            bi.RemoveBody(p.body.GetID());
            bi.DestroyBody(p.body.GetID());
            this.scene.remove(p.mesh);
            p.mesh.geometry.dispose();
            (p.mesh.material as THREE.Material).dispose();
        }
        this.placed = [];
    }

    /** Curve parameters of the two straightest, well separated stretches. */
    private straightestSpots(): [number, number] {
        const curve = this.terrain.track.curve;
        const scored: { t: number; bend: number }[] = [];
        for (let i = 0; i < CURVE_SAMPLES; i++) {
            const t = i / CURVE_SAMPLES;
            if (t < T_MIN || t > T_MAX) continue;
            // Bend = how much the tangent turns over the ramp's length ahead.
            const ahead = Math.min(T_MAX, t + RAMP_LENGTH / curve.getLength());
            const a = curve.getTangentAt(t);
            const b = curve.getTangentAt(ahead);
            scored.push({ t, bend: 1 - a.dot(b) });
        }
        scored.sort((x, y) => x.bend - y.bend);
        const first = scored[0]?.t ?? 0.25;
        const second = scored.find((s) => Math.abs(s.t - first) > MIN_SEPARATION)?.t ?? 0.6;
        return [first, second];
    }

    /** Ground point and rotation aligning local +Z with the driving direction at `t`. */
    private frameAt(t: number): { position: THREE.Vector3; rotation: THREE.Quaternion } {
        const curve = this.terrain.track.curve;
        const p = curve.getPointAt(t);
        const tangent = curve.getTangentAt(t);
        tangent.y = 0;
        tangent.normalize();
        const y = this.terrain.heightmap.heightAt(p.x, p.z);
        return {
            position: new THREE.Vector3(p.x, y, p.z),
            rotation: new THREE.Quaternion().setFromUnitVectors(
                new THREE.Vector3(0, 0, 1),
                tangent,
            ),
        };
    }

    private buildRamp(t: number): Placed {
        const Jolt = this.physics.Jolt;
        const width = this.terrain.track.width;
        const hw = width / 2;
        const L = this.rampLength;
        const H = this.rampHeight;
        // Wedge: flat base on the ground, rising to H at the far end. A hair
        // below ground at the near end so the wheels roll on without a lip.
        const local = [
            new THREE.Vector3(-hw, -0.05, 0),
            new THREE.Vector3(hw, -0.05, 0),
            new THREE.Vector3(-hw, -0.05, L),
            new THREE.Vector3(hw, -0.05, L),
            new THREE.Vector3(-hw, H, L),
            new THREE.Vector3(hw, H, L),
        ];
        const points = new Jolt.ArrayVec3();
        for (const v of local) points.push_back(new Jolt.Vec3(v.x, v.y, v.z));
        const settings = new Jolt.ConvexHullShapeSettings();
        settings.mPoints = points;
        const shape = settings.Create().Get();
        const frame = this.frameAt(t);
        const body = this.createBody(shape, frame.position, frame.rotation);

        const mesh = new THREE.Mesh(
            new ConvexGeometry(local),
            new THREE.MeshStandardMaterial({ color: 0xe0701a, roughness: 0.7 }),
        );
        return { body, mesh: this.placeMesh(mesh, frame.position, frame.rotation) };
    }

    private buildBump(t: number): Placed {
        const Jolt = this.physics.Jolt;
        const width = this.terrain.track.width;
        const r = this.bumpRadius;
        const shape = new Jolt.CylinderShape(width / 2, r, 0.02);
        const frame = this.frameAt(t);
        // Cylinder axis is Y; lay it across the track (local X) and sink it
        // so only `bumpHeight` sticks out.
        const lie = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 0, 1),
            Math.PI / 2,
        );
        const rotation = frame.rotation.clone().multiply(lie);
        const position = frame.position.clone();
        position.y += this.bumpHeight - r;
        const body = this.createBody(shape, position, rotation);

        const mesh = new THREE.Mesh(
            new THREE.CylinderGeometry(r, r, width, 32),
            new THREE.MeshStandardMaterial({ color: 0xf2d21b, roughness: 0.8 }),
        );
        return { body, mesh: this.placeMesh(mesh, position, rotation) };
    }

    private createBody(
        shape: InstanceType<JoltAPI['Shape']>,
        position: THREE.Vector3,
        rotation: THREE.Quaternion,
    ): JoltBody {
        const Jolt = this.physics.Jolt;
        const settings = new Jolt.BodyCreationSettings(
            shape,
            new Jolt.RVec3(position.x, position.y, position.z),
            new Jolt.Quat(rotation.x, rotation.y, rotation.z, rotation.w),
            Jolt.EMotionType_Static,
            LAYER_NON_MOVING,
        );
        settings.mFriction = FRICTION;
        const body = this.physics.bodyInterface.CreateBody(settings);
        this.physics.bodyInterface.AddBody(body.GetID(), Jolt.EActivation_DontActivate);
        Jolt.destroy(settings);
        return body;
    }

    private placeMesh(
        mesh: THREE.Mesh,
        position: THREE.Vector3,
        rotation: THREE.Quaternion,
    ): THREE.Mesh {
        mesh.position.copy(position);
        mesh.quaternion.copy(rotation);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        return mesh;
    }

    override registerDebug(gui: GUI): void {
        const f = gui.addFolder('Obstacles');
        f.close();
        const rebuild = (): void => {
            this.rebuild();
        };
        f.add(this, 'rampEnabled').name('Ramp').onChange(rebuild);
        f.add(this, 'rampLength', 2, 15, 0.5).name('Ramp length (m)').onChange(rebuild);
        f.add(this, 'rampHeight', 0.2, 3, 0.1).name('Ramp height (m)').onChange(rebuild);
        f.add(this, 'rampT', 0, 1, 0.001).name('Ramp at (t)').listen().disable();
        f.add(this, 'bumpEnabled').name('Speed bump').onChange(rebuild);
        f.add(this, 'bumpRadius', 0.1, 1, 0.05).name('Bump radius (m)').onChange(rebuild);
        f.add(this, 'bumpHeight', 0.05, 0.6, 0.01).name('Bump height (m)').onChange(rebuild);
        f.add(this, 'bumpT', 0, 1, 0.001).name('Bump at (t)').listen().disable();
    }
}

export function createObstacles(physics: Physics, scene: THREE.Scene): GameObject {
    return new GameObject('obstacles', [new ObstaclesBehavior(physics, scene)]);
}
