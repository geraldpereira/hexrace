import * as THREE from 'three';
import type GUI from 'lil-gui';
import { Component, GameObject } from '../../engine/gameObject';
import { CarBehavior, type WheelReadout } from '../car/carBehavior';
import { SURFACES } from '../terrain/surfaces';

// Ring buffer of quads shared by all wheels; the oldest marks vanish first.
const MAX_SEGMENTS = 6000;
const VERTS_PER_SEGMENT = 6;
// A new quad is laid every this many metres of wheel travel.
const SEGMENT_LENGTH = 0.12;
// Lift above the contact point so the mark doesn't z-fight the ground.
const LIFT = 0.015;
// Longitudinal slip ratio where the mark starts, and where it is full.
// A locked wheel reads -1; a spinning one goes well past +1.
const LOCK_SLIP_START = 0.4;
const LOCK_SLIP_FULL = 0.8;
// Lateral slip (°) where the mark starts and is full, when enabled.
const LATERAL_ENABLED = false;
const LATERAL_START_DEG = 12;
const LATERAL_FULL_DEG = 25;
const WIDTH_SCALE = 1;

interface WheelTrail {
    active: boolean;
    readonly left: THREE.Vector3;
    readonly right: THREE.Vector3;
    intensity: number;
}

/**
 * Skid marks: a ribbon per wheel, laid on the ground while the tyre slides
 * (locked under braking or hand brake by default, optionally sideways too).
 * One non-indexed geometry, six vertices per quad, RGBA vertex colours so
 * each edge fades with the slip and takes the surface's mark colour.
 */
export class SkidMarksBehavior extends Component {
    enabled = true;
    lockSlipStart = LOCK_SLIP_START;
    lockSlipFull = LOCK_SLIP_FULL;
    lateralEnabled = LATERAL_ENABLED;
    lateralStartDeg = LATERAL_START_DEG;
    lateralFullDeg = LATERAL_FULL_DEG;
    widthScale = WIDTH_SCALE;
    /** Quads laid so far (wraps at the buffer size), debug readout. */
    segments = 0;

    private car!: CarBehavior;
    private readonly mesh: THREE.Mesh;
    private readonly positions: THREE.BufferAttribute;
    private readonly colors: THREE.BufferAttribute;
    private head = 0;
    private trails: WheelTrail[] = [];
    private readonly tmpColor = new THREE.Color();
    private readonly tmpLeft = new THREE.Vector3();
    private readonly tmpRight = new THREE.Vector3();
    private readonly tmpMid = new THREE.Vector3();
    private readonly tmpLastMid = new THREE.Vector3();

    constructor(private readonly scene: THREE.Scene) {
        super();
        const geometry = new THREE.BufferGeometry();
        this.positions = new THREE.BufferAttribute(
            new Float32Array(MAX_SEGMENTS * VERTS_PER_SEGMENT * 3),
            3,
        );
        this.colors = new THREE.BufferAttribute(
            new Float32Array(MAX_SEGMENTS * VERTS_PER_SEGMENT * 4),
            4,
        );
        this.positions.setUsage(THREE.DynamicDrawUsage);
        this.colors.setUsage(THREE.DynamicDrawUsage);
        geometry.setAttribute('position', this.positions);
        geometry.setAttribute('color', this.colors);
        const material = new THREE.MeshBasicMaterial({
            vertexColors: true,
            transparent: true,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2,
        });
        this.mesh = new THREE.Mesh(geometry, material);
        // The buffer spans the whole track; never let Three cull it.
        this.mesh.frustumCulled = false;
        this.mesh.renderOrder = 1;
        this.mesh.receiveShadow = true;
    }

    override start(): void {
        const car = this.gameObject.findInScene(CarBehavior);
        if (!car) throw new Error('SkidMarksBehavior: no CarBehavior in scene');
        this.car = car;
        this.trails = car.readouts.map(() => ({
            active: false,
            left: new THREE.Vector3(),
            right: new THREE.Vector3(),
            intensity: 0,
        }));
        this.scene.add(this.mesh);
    }

    override onDestroy(): void {
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        (this.mesh.material as THREE.Material).dispose();
    }

    override render(): void {
        let dirty = false;
        for (const [i, readout] of this.car.readouts.entries()) {
            const trail = this.trails[i];
            if (!trail) continue;
            const intensity = this.enabled && readout.contact ? this.intensity(readout) : 0;
            if (intensity <= 0) {
                trail.active = false;
                continue;
            }
            const half = (readout.width * this.widthScale) / 2;
            this.tmpLeft
                .copy(readout.point)
                .addScaledVector(readout.normal, LIFT)
                .addScaledVector(readout.lateral, -half);
            this.tmpRight
                .copy(readout.point)
                .addScaledVector(readout.normal, LIFT)
                .addScaledVector(readout.lateral, half);

            if (trail.active) {
                this.tmpMid.addVectors(this.tmpLeft, this.tmpRight).multiplyScalar(0.5);
                this.tmpLastMid.addVectors(trail.left, trail.right).multiplyScalar(0.5);
                if (this.tmpMid.distanceTo(this.tmpLastMid) < SEGMENT_LENGTH) continue;
                const surface = SURFACES[readout.surfaceId] ?? SURFACES[0];
                if (surface) {
                    this.pushQuad(
                        trail,
                        this.tmpLeft,
                        this.tmpRight,
                        intensity,
                        surface.markColor,
                        surface.markOpacity,
                    );
                    dirty = true;
                }
            }
            trail.active = true;
            trail.left.copy(this.tmpLeft);
            trail.right.copy(this.tmpRight);
            trail.intensity = intensity;
        }
        if (dirty) {
            this.positions.needsUpdate = true;
            this.colors.needsUpdate = true;
        }
    }

    private intensity(r: WheelReadout): number {
        const lock = ramp(Math.abs(r.long), this.lockSlipStart, this.lockSlipFull);
        const lateral = this.lateralEnabled
            ? ramp(Math.abs(r.lat), this.lateralStartDeg, this.lateralFullDeg)
            : 0;
        return Math.max(lock, lateral);
    }

    private pushQuad(
        trail: WheelTrail,
        left: THREE.Vector3,
        right: THREE.Vector3,
        intensity: number,
        color: number,
        opacity: number,
    ): void {
        const base = this.head * VERTS_PER_SEGMENT;
        const c = this.tmpColor.setHex(color);
        const a0 = trail.intensity * opacity;
        const a1 = intensity * opacity;
        // Two triangles: (lastL, lastR, R) and (lastL, R, L).
        this.vertex(base, trail.left, c, a0);
        this.vertex(base + 1, trail.right, c, a0);
        this.vertex(base + 2, right, c, a1);
        this.vertex(base + 3, trail.left, c, a0);
        this.vertex(base + 4, right, c, a1);
        this.vertex(base + 5, left, c, a1);
        this.positions.addUpdateRange(base * 3, VERTS_PER_SEGMENT * 3);
        this.colors.addUpdateRange(base * 4, VERTS_PER_SEGMENT * 4);
        this.head = (this.head + 1) % MAX_SEGMENTS;
        this.segments++;
    }

    private vertex(index: number, p: THREE.Vector3, c: THREE.Color, alpha: number): void {
        this.positions.setXYZ(index, p.x, p.y, p.z);
        this.colors.setXYZW(index, c.r, c.g, c.b, alpha);
    }

    clear(): void {
        (this.positions.array as Float32Array).fill(0);
        (this.colors.array as Float32Array).fill(0);
        this.positions.clearUpdateRanges();
        this.colors.clearUpdateRanges();
        this.positions.needsUpdate = true;
        this.colors.needsUpdate = true;
        this.head = 0;
        this.segments = 0;
        for (const t of this.trails) t.active = false;
    }

    override registerDebug(gui: GUI): void {
        const f = gui.addFolder('Skid marks');
        f.close();
        f.add(this, 'enabled').name('Enabled');
        f.add(this, 'lockSlipStart', 0.05, 1, 0.05).name('Lock slip start');
        f.add(this, 'lockSlipFull', 0.1, 1.5, 0.05).name('Lock slip full');
        f.add(this, 'lateralEnabled').name('Sideways too');
        f.add(this, 'lateralStartDeg', 2, 45, 1).name('Lateral start (°)');
        f.add(this, 'lateralFullDeg', 5, 60, 1).name('Lateral full (°)');
        f.add(this, 'widthScale', 0.3, 2, 0.1).name('Width scale');
        f.add(this, 'segments').name('Segments').listen().disable();
        f.add(this, 'clear').name('Clear');
    }
}

function ramp(v: number, start: number, full: number): number {
    if (full <= start) return v >= full ? 1 : 0;
    return Math.min(Math.max((v - start) / (full - start), 0), 1);
}

export function createSkidMarks(scene: THREE.Scene): GameObject {
    return new GameObject('skidMarks', [new SkidMarksBehavior(scene)]);
}
