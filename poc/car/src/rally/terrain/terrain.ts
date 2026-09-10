import * as THREE from 'three';
import type GUI from 'lil-gui';
import { Heightmap, type HeightmapOptions } from './heightmap';
import { createTerrainMaterial } from './terrainMaterial';
import { Track } from './track';
import { SurfaceMap } from './surfaceMap';
import { SURFACE_NAMES } from './surfaces';
import { Component, GameObject } from '../../engine/gameObject';
import { BodyComponent, MeshComponent } from '../../engine/components';
import { LAYER_NON_MOVING, type Physics } from '../../engine/physics';

// Surface grip is handled per wheel by the car from the surface map, so the
// Jolt body friction stays at 1 and drops out of Jolt's sqrt(tyre * ground).
const BODY_FRICTION = 1;

export class TerrainData extends Component {
    constructor(
        public readonly heightmap: Heightmap,
        public readonly track: Track,
        public readonly surfaceMap: SurfaceMap,
    ) {
        super();
    }

    /** Surface id under a world position. */
    surfaceAt(x: number, z: number): number {
        return this.surfaceMap.surfaceAt(x, z);
    }

    override registerDebug(gui: GUI): void {
        const f = gui.addFolder('Terrain');
        const o = this.surfaceMap.options;
        const rebuild = (): void => {
            this.surfaceMap.rebuild();
        };
        f.add(o, 'track', SURFACE_NAMES).name('Track surface').onChange(rebuild);
        f.add(o, 'verge', SURFACE_NAMES).name('Verge surface').onChange(rebuild);
        f.add(o, 'patches', SURFACE_NAMES).name('Patches surface').onChange(rebuild);
        f.add(o, 'patchThreshold', -1, 1, 0.05).name('Patch threshold').onChange(rebuild);
        f.add(o, 'patchFrequency', 0.005, 0.2, 0.005).name('Patch frequency').onChange(rebuild);
    }
}

export function createTerrain(
    physics: Physics,
    scene: THREE.Scene,
    options: Partial<HeightmapOptions> = {},
): GameObject {
    const heightmap = new Heightmap(options);
    const track = new Track(heightmap);
    const surfaceMap = new SurfaceMap(heightmap, track);
    const mesh = buildTerrainMesh(heightmap, surfaceMap);
    const body = buildTerrainBody(heightmap, physics);

    return new GameObject('terrain', [
        new MeshComponent(scene, mesh),
        new BodyComponent(physics, body),
        new TerrainData(heightmap, track, surfaceMap),
    ]);
}

function buildTerrainMesh(heightmap: Heightmap, surfaceMap: SurfaceMap): THREE.Mesh {
    const { heights, size, segments } = heightmap;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);
    const positions = geometry.attributes.position as THREE.BufferAttribute;
    for (const [i, h] of heights.entries()) {
        positions.setY(i, h);
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    const material = createTerrainMaterial({ surfaceMap: surfaceMap.texture });
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
    bodySettings.mFriction = BODY_FRICTION;
    const body = physics.bodyInterface.CreateBody(bodySettings);
    physics.bodyInterface.AddBody(body.GetID(), Jolt.EActivation_DontActivate);
    Jolt.destroy(bodySettings);
    return body;
}
