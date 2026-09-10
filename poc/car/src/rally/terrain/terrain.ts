import * as THREE from 'three';
import type initJolt from 'jolt-physics';
import type GUI from 'lil-gui';
import { Heightmap, type HeightmapOptions } from './heightmap';
import { createTerrainMaterial } from './terrainMaterial';
import { Track } from './track';
import { Component, GameObject } from '../../engine/gameObject';
import { BodyComponent, MeshComponent } from '../../engine/components';
import { LAYER_NON_MOVING, type Physics } from '../../engine/physics';

type JoltAPI = Awaited<ReturnType<typeof initJolt>>;
type JoltBody = InstanceType<JoltAPI['Body']>;

// Jolt combines tyre and ground friction as sqrt(tyre_curve * ground), so
// this multiplies with the wheel friction curves rather than capping them.
const DEFAULT_GROUND_FRICTION = 1.5;

export class TerrainData extends Component {
    constructor(
        public readonly heightmap: Heightmap,
        public readonly track: Track,
        private readonly body: JoltBody,
    ) {
        super();
    }

    override registerDebug(gui: GUI): void {
        const f = gui.addFolder('Terrain');
        const cfg = { friction: this.body.GetFriction() };
        f.add(cfg, 'friction', 0, 4, 0.05)
            .name('Ground friction')
            .onChange((v: number) => {
                this.body.SetFriction(v);
            });
    }
}

export function createTerrain(
    physics: Physics,
    scene: THREE.Scene,
    options: Partial<HeightmapOptions> = {},
): GameObject {
    const heightmap = new Heightmap(options);
    const track = new Track(heightmap);
    const mesh = buildTerrainMesh(heightmap, track);
    const body = buildTerrainBody(heightmap, physics);

    return new GameObject('terrain', [
        new MeshComponent(scene, mesh),
        new BodyComponent(physics, body),
        new TerrainData(heightmap, track, body),
    ]);
}

function buildTerrainMesh(heightmap: Heightmap, track: Track): THREE.Mesh {
    const { heights, size, segments } = heightmap;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);
    const positions = geometry.attributes.position as THREE.BufferAttribute;
    for (const [i, h] of heights.entries()) {
        positions.setY(i, h);
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    const material = createTerrainMaterial({
        trackMask: track.maskTexture,
        terrainSize: size,
        trackWidth: track.width,
        trackFeather: track.feather,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    return mesh;
}

function buildTerrainBody(heightmap: Heightmap, physics: Physics) {
    const { heights, size, segments } = heightmap;
    const Jolt = physics.Jolt;
    const n = segments + 1;
    const step = size / segments;

    // Jolt's HeightFieldShape stores samples as heights[x + z * N], with X
    // varying fastest — same convention as Three's PlaneGeometry vertex order,
    // so no transpose is needed.
    const shapeSettings = new Jolt.HeightFieldShapeSettings();
    shapeSettings.mSampleCount = n;
    shapeSettings.mOffset.Set(-size / 2, 0, -size / 2);
    shapeSettings.mScale.Set(step, 1, step);
    shapeSettings.mHeightSamples.resize(heights.length);
    const heightSamples = new Float32Array(
        Jolt.HEAPF32.buffer,
        Jolt.getPointer(shapeSettings.mHeightSamples.data()),
        heights.length,
    );
    heightSamples.set(heights);
    const shape = shapeSettings.Create().Get();

    const bodySettings = new Jolt.BodyCreationSettings(
        shape,
        new Jolt.RVec3(0, 0, 0),
        new Jolt.Quat(0, 0, 0, 1),
        Jolt.EMotionType_Static,
        LAYER_NON_MOVING,
    );
    bodySettings.mFriction = DEFAULT_GROUND_FRICTION;
    const body = physics.bodyInterface.CreateBody(bodySettings);
    physics.bodyInterface.AddBody(body.GetID(), Jolt.EActivation_DontActivate);
    Jolt.destroy(bodySettings);
    return body;
}
