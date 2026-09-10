export interface GameLoopConfig {
    /** Physics / deterministic-update step size, in seconds. */
    fixedTimestep: number;

    /** Called once per fixed step. Run input + physics + deterministic logic here. */
    fixedUpdate: () => void;

    /** Called once per render frame with the elapsed time since the previous frame. */
    render: (dt: number) => void;

    /** Optional hook called at the very start of each render frame (e.g. stats.begin). */
    beforeFrame?: () => void;

    /** Optional hook called at the very end of each render frame (e.g. stats.end). */
    afterFrame?: () => void;

    /** Hard upper bound on dt accepted per frame, in seconds. Avoids huge catch-up jumps after tab suspend. */
    maxFrameDt?: number;

    /** Hard cap on the number of fixed steps run per frame. Prevents spiral-of-death. */
    maxStepsPerFrame?: number;

    /** Called when maxStepsPerFrame is reached and the accumulator is dropped. */
    onPanic?: () => void;
}

/** Fixed-timestep game loop with an accumulator pattern. */
export class GameLoop {
    private readonly maxFrameDt: number;
    private readonly maxSteps: number;
    private accumulator = 0;
    private lastTime = 0;
    private rafHandle = 0;
    private running = false;

    constructor(private readonly config: GameLoopConfig) {
        this.maxFrameDt = config.maxFrameDt ?? 0.1;
        this.maxSteps = config.maxStepsPerFrame ?? 5;
    }

    start(): void {
        if (this.running) return;
        this.running = true;
        this.lastTime = performance.now();
        this.rafHandle = requestAnimationFrame(this.frame);
    }

    stop(): void {
        this.running = false;
        cancelAnimationFrame(this.rafHandle);
    }

    /** Arrow class field (not a regular method) so `this` stays bound when `frame` is passed to requestAnimationFrame. */
    private frame = (now: number): void => {
        if (!this.running) return;
        this.config.beforeFrame?.();

        const dt = Math.min((now - this.lastTime) / 1000, this.maxFrameDt);
        this.lastTime = now;
        this.accumulator += dt;

        let steps = 0;
        while (this.accumulator >= this.config.fixedTimestep && steps < this.maxSteps) {
            this.config.fixedUpdate();
            this.accumulator -= this.config.fixedTimestep;
            steps += 1;
        }
        if (steps === this.maxSteps) {
            this.accumulator = 0;
            this.config.onPanic?.();
        }

        this.config.render(dt);

        this.config.afterFrame?.();
        this.rafHandle = requestAnimationFrame(this.frame);
    };
}
