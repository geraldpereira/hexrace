import * as THREE from 'three';
import type GUI from 'lil-gui';
import { Component, GameObject } from '../../engine/gameObject';
import { PerspectiveCameraComponent } from '../../engine/components';
import { CarBehavior, type WheelReadout } from '../car/carBehavior';
import { SkidMarksBehavior } from './skidMarks';
import { TerrainData } from '../terrain/terrain';
import { SURFACES, type SurfaceParticles } from '../terrain/surfaces';

const MAX_PARTICLES = 3000;
const GRAVITY = 9.81;
// Rolling emission reaches its full rate at this speed (km/h).
const ROLL_FULL_KMH = 80;
// How much of the car's speed the thrown bits inherit (they fly back
// relative to the car) and how much the tyre scrub adds on top.
const DUST_SPEED_SHARE = 0.25;
const DEBRIS_SPEED_SHARE = 0.35;
const SCRUB_SHARE = 0.5;
// Vertical kick (m/s) and random spread (m/s).
const DUST_UP = 1.2;
const DEBRIS_UP = 3;
const DUST_SPREAD = 1;
const DEBRIS_SPREAD = 2.5;
// Dust drag (1/s) and its slow rise (m/s); debris just falls.
const DUST_DRAG = 1.5;
const DUST_RISE = 0.4;

interface Particle {
    alive: boolean;
    kind: 0 | 1;
    age: number;
    life: number;
    size: number;
    alpha: number;
    readonly pos: THREE.Vector3;
    readonly vel: THREE.Vector3;
    readonly color: THREE.Color;
}

const VERTEX = /* glsl */ `
    attribute float aSize;
    attribute float aAlpha;
    attribute vec3 aColor;
    uniform float uScale;
    varying float vAlpha;
    varying vec3 vColor;
    void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uScale / max(-mv.z, 0.1);
        vAlpha = aAlpha;
        vColor = aColor;
    }
`;
const FRAGMENT = /* glsl */ `
    varying float vAlpha;
    varying vec3 vColor;
    void main() {
        vec2 d = gl_PointCoord - 0.5;
        float r = length(d) * 2.0;
        if (r > 1.0) discard;
        // Soft disc: dense middle, feathered edge.
        float a = vAlpha * (1.0 - r * r);
        gl_FragColor = vec4(vColor, a);
    }
`;

/**
 * Dust and debris thrown by the wheels. Two kinds per surface: puffs that
 * grow, fade and drift (smoke on asphalt, dust on the loose stuff) and
 * solid bits under gravity (stones, clods) that stop where they land.
 * Emission follows the slide intensity from the skid marks and, on loose
 * surfaces, plain rolling speed. One THREE.Points with a sprite shader,
 * CPU-simulated ring buffer.
 */
export class ParticlesBehavior extends Component {
    enabled = true;
    slideRate = 1;
    rollRate = 1;
    /** Live particles, debug readout. */
    alive = 0;

    private car!: CarBehavior;
    private skidMarks!: SkidMarksBehavior;
    private terrain!: TerrainData;
    private camera: THREE.PerspectiveCamera | null = null;
    private readonly points: THREE.Points;
    private readonly material: THREE.ShaderMaterial;
    private readonly positions: THREE.BufferAttribute;
    private readonly colors: THREE.BufferAttribute;
    private readonly sizes: THREE.BufferAttribute;
    private readonly alphas: THREE.BufferAttribute;
    private readonly particles: Particle[] = [];
    private head = 0;
    /** Fractional emission carried between frames, per wheel and kind. */
    private readonly carry: number[] = [];
    private readonly tmpBack = new THREE.Vector3();
    private readonly tmpVel = new THREE.Vector3();

    constructor(private readonly scene: THREE.Scene) {
        super();
        const geometry = new THREE.BufferGeometry();
        this.positions = new THREE.BufferAttribute(new Float32Array(MAX_PARTICLES * 3), 3);
        this.colors = new THREE.BufferAttribute(new Float32Array(MAX_PARTICLES * 3), 3);
        this.sizes = new THREE.BufferAttribute(new Float32Array(MAX_PARTICLES), 1);
        this.alphas = new THREE.BufferAttribute(new Float32Array(MAX_PARTICLES), 1);
        for (const a of [this.positions, this.colors, this.sizes, this.alphas]) {
            a.setUsage(THREE.DynamicDrawUsage);
        }
        geometry.setAttribute('position', this.positions);
        geometry.setAttribute('aColor', this.colors);
        geometry.setAttribute('aSize', this.sizes);
        geometry.setAttribute('aAlpha', this.alphas);
        this.material = new THREE.ShaderMaterial({
            vertexShader: VERTEX,
            fragmentShader: FRAGMENT,
            uniforms: { uScale: { value: 500 } },
            transparent: true,
            depthWrite: false,
        });
        this.points = new THREE.Points(geometry, this.material);
        this.points.frustumCulled = false;
        this.points.renderOrder = 2;
        for (let i = 0; i < MAX_PARTICLES; i++) {
            this.particles.push({
                alive: false,
                kind: 0,
                age: 0,
                life: 1,
                size: 0,
                alpha: 0,
                pos: new THREE.Vector3(),
                vel: new THREE.Vector3(),
                color: new THREE.Color(),
            });
        }
    }

    override start(): void {
        const car = this.gameObject.findInScene(CarBehavior);
        if (!car) throw new Error('ParticlesBehavior: no CarBehavior in scene');
        this.car = car;
        const skidMarks = this.gameObject.findInScene(SkidMarksBehavior);
        if (!skidMarks) throw new Error('ParticlesBehavior: no SkidMarksBehavior in scene');
        this.skidMarks = skidMarks;
        const terrain = this.gameObject.findInScene(TerrainData);
        if (!terrain) throw new Error('ParticlesBehavior: no TerrainData in scene');
        this.terrain = terrain;
        this.camera = this.gameObject.findInScene(PerspectiveCameraComponent)?.camera ?? null;
        this.carry.length = car.readouts.length * 2;
        this.carry.fill(0);
        this.scene.add(this.points);
    }

    override onDestroy(): void {
        this.scene.remove(this.points);
        this.points.geometry.dispose();
        this.material.dispose();
    }

    override render(dt: number): void {
        if (this.enabled) this.emit(dt);
        this.simulate(dt);
        this.upload();
    }

    private emit(dt: number): void {
        const car = this.car;
        const speed = car.velocity.length();
        const roll = Math.min(car.speedKmh / ROLL_FULL_KMH, 1);
        // Bits fly back along the car's travel; at rest, along the wheel.
        for (const [i, readout] of car.readouts.entries()) {
            if (!readout.contact) continue;
            const surface = SURFACES[readout.surfaceId];
            if (!surface) continue;
            const cfg = surface.particles;
            const slide = this.skidMarks.wheelIntensity[i] ?? 0;
            if (speed > 0.5) this.tmpBack.copy(car.velocity).multiplyScalar(-1 / speed);
            else this.tmpBack.copy(readout.longitudinal).multiplyScalar(-1);

            const dustRate =
                (cfg.slideDust * slide * this.slideRate + cfg.rollDust * roll * this.rollRate) * dt;
            const debrisRate =
                (cfg.slideDebris * slide * this.slideRate + cfg.rollDebris * roll * this.rollRate) *
                dt;
            this.spawnMany(i * 2, dustRate, 0, readout, cfg, speed, slide);
            this.spawnMany(i * 2 + 1, debrisRate, 1, readout, cfg, speed, slide);
        }
    }

    private spawnMany(
        carryIndex: number,
        rate: number,
        kind: 0 | 1,
        readout: WheelReadout,
        cfg: SurfaceParticles,
        speed: number,
        slide: number,
    ): void {
        let n = (this.carry[carryIndex] ?? 0) + rate;
        while (n >= 1) {
            this.spawn(kind, readout, cfg, speed, slide);
            n -= 1;
        }
        this.carry[carryIndex] = n;
    }

    private spawn(
        kind: 0 | 1,
        readout: WheelReadout,
        cfg: SurfaceParticles,
        speed: number,
        slide: number,
    ): void {
        const p = this.particles[this.head];
        if (!p) return;
        this.head = (this.head + 1) % MAX_PARTICLES;
        const dust = kind === 0;
        p.alive = true;
        p.kind = kind;
        p.age = 0;
        p.life = (dust ? cfg.dustLife : cfg.debrisLife) * (0.7 + Math.random() * 0.6);
        p.size = (dust ? cfg.dustSize : cfg.debrisSize) * (0.7 + Math.random() * 0.6);
        p.alpha = dust ? cfg.dustAlpha : 1;
        p.color.setHex(dust ? cfg.dustColor : cfg.debrisColor);
        // Shade debris a little so a shower isn't one flat colour.
        if (!dust) p.color.multiplyScalar(0.8 + Math.random() * 0.4);
        // Start just behind the contact, a touch above ground, spread across the tyre.
        p.pos
            .copy(readout.point)
            .addScaledVector(this.tmpBack, 0.2)
            .addScaledVector(readout.lateral, (Math.random() - 0.5) * readout.width)
            .addScaledVector(readout.normal, 0.05);
        const share = dust ? DUST_SPEED_SHARE : DEBRIS_SPEED_SHARE;
        const spread = (dust ? DUST_SPREAD : DEBRIS_SPREAD) * (0.5 + slide);
        const up = (dust ? DUST_UP : DEBRIS_UP) * (0.5 + slide + 0.5 * Math.random());
        this.tmpVel
            .copy(this.tmpBack)
            .multiplyScalar(speed * share + readout.slipSpeed * SCRUB_SHARE)
            .addScaledVector(readout.normal, up)
            .addScaledVector(readout.lateral, (Math.random() - 0.5) * 2 * spread)
            .addScaledVector(readout.longitudinal, (Math.random() - 0.5) * spread);
        p.vel.copy(this.tmpVel);
    }

    private simulate(dt: number): void {
        let alive = 0;
        for (const p of this.particles) {
            if (!p.alive) continue;
            p.age += dt;
            if (p.age >= p.life) {
                p.alive = false;
                continue;
            }
            alive++;
            if (p.kind === 0) {
                p.vel.multiplyScalar(Math.max(0, 1 - DUST_DRAG * dt));
                p.vel.y += DUST_RISE * dt;
                p.pos.addScaledVector(p.vel, dt);
            } else if (p.vel.lengthSq() > 0) {
                p.vel.y -= GRAVITY * dt;
                p.pos.addScaledVector(p.vel, dt);
                const ground = this.terrain.heightmap.heightAt(p.pos.x, p.pos.z);
                if (p.pos.y < ground + p.size * 0.5) {
                    p.pos.y = ground + p.size * 0.5;
                    p.vel.set(0, 0, 0);
                }
            }
        }
        this.alive = alive;
    }

    private upload(): void {
        for (const [i, p] of this.particles.entries()) {
            if (!p.alive) {
                this.alphas.setX(i, 0);
                this.sizes.setX(i, 0);
                continue;
            }
            const u = p.age / p.life;
            const dust = p.kind === 0;
            // Puffs grow and fade out; debris keeps its size and vanishes at the end.
            const size = dust ? p.size * (1 + u * 1.2) : p.size;
            const alpha = dust ? p.alpha * (1 - u) * (1 - u) : u > 0.8 ? (1 - u) * 5 : 1;
            this.positions.setXYZ(i, p.pos.x, p.pos.y, p.pos.z);
            this.colors.setXYZ(i, p.color.r, p.color.g, p.color.b);
            this.sizes.setX(i, size);
            this.alphas.setX(i, alpha);
        }
        this.positions.needsUpdate = true;
        this.colors.needsUpdate = true;
        this.sizes.needsUpdate = true;
        this.alphas.needsUpdate = true;
        // Point size is in pixels: metres × (pixels per metre at 1 m).
        const cam = this.camera;
        if (cam) {
            const heightPx = window.innerHeight * Math.min(window.devicePixelRatio, 2);
            const fov = (cam.fov * Math.PI) / 180;
            this.material.uniforms.uScale = { value: heightPx / (2 * Math.tan(fov / 2)) };
        }
    }

    override registerDebug(gui: GUI): void {
        const f = gui.addFolder('Particles');
        f.close();
        f.add(this, 'enabled').name('Enabled');
        f.add(this, 'slideRate', 0, 3, 0.1).name('Slide rate ×');
        f.add(this, 'rollRate', 0, 3, 0.1).name('Roll rate ×');
        f.add(this, 'alive').name('Alive').listen().disable();
        for (const surface of SURFACES) {
            const sf = f.addFolder(surface.name);
            sf.close();
            const c = surface.particles;
            sf.addColor(c, 'dustColor').name('Dust colour');
            sf.add(c, 'dustAlpha', 0, 1, 0.05).name('Dust opacity');
            sf.add(c, 'dustSize', 0.1, 2, 0.05).name('Dust size (m)');
            sf.add(c, 'dustLife', 0.2, 4, 0.1).name('Dust life (s)');
            sf.add(c, 'slideDust', 0, 200, 5).name('Dust on slide (/s)');
            sf.add(c, 'rollDust', 0, 100, 1).name('Dust rolling (/s)');
            sf.addColor(c, 'debrisColor').name('Debris colour');
            sf.add(c, 'debrisSize', 0, 0.4, 0.01).name('Debris size (m)');
            sf.add(c, 'debrisLife', 0, 4, 0.1).name('Debris life (s)');
            sf.add(c, 'slideDebris', 0, 200, 5).name('Debris on slide (/s)');
            sf.add(c, 'rollDebris', 0, 100, 1).name('Debris rolling (/s)');
        }
    }
}

export function createParticles(scene: THREE.Scene): GameObject {
    return new GameObject('particles', [new ParticlesBehavior(scene)]);
}
