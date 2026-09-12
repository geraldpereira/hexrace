import { Component, GameObject } from '../../engine/gameObject';
import { ScoreComponent } from '../score';
import { CarBehavior } from '../car/carBehavior';

// Above this share of the shift-up point the RPM bar turns red.
const REDLINE_SHARE = 0.9;

export class HudBehavior extends Component {
    private readonly scoreEl = document.getElementById('hud-score');
    private readonly gearEl = document.getElementById('hud-gear');
    private readonly rpmFillEl = document.getElementById('hud-rpm-fill');
    private readonly rpmEl = document.getElementById('hud-rpm');
    private readonly speedEl = document.getElementById('hud-speed');
    private lastValue = -1;
    private lastGear = Number.NaN;
    private lastRpm = -1;
    private lastSpeed = -1;
    private score!: ScoreComponent;
    private car!: CarBehavior;

    override start(): void {
        const s = this.gameObject.findInScene(ScoreComponent);
        if (!s) throw new Error('HudBehavior: no ScoreComponent in scene');
        this.score = s;
        const car = this.gameObject.findInScene(CarBehavior);
        if (!car) throw new Error('HudBehavior: no CarBehavior in scene');
        this.car = car;
    }

    override render(): void {
        if (this.scoreEl && this.score.points !== this.lastValue) {
            this.lastValue = this.score.points;
            this.scoreEl.textContent = String(this.lastValue);
        }
        this.renderDrive();
    }

    private renderDrive(): void {
        const car = this.car;
        if (this.gearEl && car.gear !== this.lastGear) {
            this.lastGear = car.gear;
            this.gearEl.textContent = car.gear < 0 ? 'R' : car.gear === 0 ? 'N' : String(car.gear);
        }
        const rpm = Math.round(car.rpm / 50) * 50;
        if (rpm !== this.lastRpm) {
            this.lastRpm = rpm;
            if (this.rpmEl) this.rpmEl.textContent = String(rpm);
            if (this.rpmFillEl) {
                const share = Math.min(car.rpm / car.maxRpm, 1);
                this.rpmFillEl.style.width = `${String(Math.round(share * 100))}%`;
                this.rpmFillEl.classList.toggle('redline', car.rpm >= car.shiftUpRpm * REDLINE_SHARE);
            }
        }
        const speed = Math.round(car.speedKmh);
        if (this.speedEl && speed !== this.lastSpeed) {
            this.lastSpeed = speed;
            this.speedEl.textContent = String(speed);
        }
    }
}

export function createHud(): GameObject {
    return new GameObject('hud', [new HudBehavior()]);
}
