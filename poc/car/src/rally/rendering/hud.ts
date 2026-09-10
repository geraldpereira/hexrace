import { Component, GameObject } from '../../engine/gameObject';
import { ScoreComponent } from '../score';

export class HudBehavior extends Component {
    private readonly scoreEl = document.getElementById('hud-score');
    private lastValue = -1;
    private score!: ScoreComponent;

    override start(): void {
        const s = this.gameObject.findInScene(ScoreComponent);
        if (!s) throw new Error('HudBehavior: no ScoreComponent in scene');
        this.score = s;
    }

    override render(): void {
        if (!this.scoreEl) return;
        if (this.score.points !== this.lastValue) {
            this.lastValue = this.score.points;
            this.scoreEl.textContent = String(this.lastValue);
        }
    }
}

export function createHud(): GameObject {
    return new GameObject('hud', [new HudBehavior()]);
}
