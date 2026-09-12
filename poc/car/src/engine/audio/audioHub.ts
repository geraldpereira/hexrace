/**
 * One AudioContext for the whole game, created on the first user gesture
 * (browsers refuse to start audio before one; gamepad input doesn't count).
 * Sound components register a callback and get the context once it exists.
 * Worklet modules are loaded once per name from source text via a Blob URL,
 * so they work in dev and in the bundle without a separate asset.
 */
export class AudioHub {
    private static instance: AudioHub | null = null;

    private ctx: AudioContext | null = null;
    private readonly waiting: ((ctx: AudioContext) => void)[] = [];
    private readonly modules = new Map<string, Promise<void>>();
    private readonly onGesture = (): void => {
        this.unlock();
    };

    static get(): AudioHub {
        AudioHub.instance ??= new AudioHub();
        return AudioHub.instance;
    }

    private constructor() {
        window.addEventListener('keydown', this.onGesture);
        window.addEventListener('pointerdown', this.onGesture);
    }

    /** Runs `cb` with the context as soon as it exists (at once if it already does). */
    whenReady(cb: (ctx: AudioContext) => void): void {
        if (this.ctx) cb(this.ctx);
        else this.waiting.push(cb);
    }

    /** Loads a worklet processor from its source text, once per `name`. */
    loadWorklet(ctx: AudioContext, name: string, source: string): Promise<void> {
        let pending = this.modules.get(name);
        if (!pending) {
            const url = URL.createObjectURL(new Blob([source], { type: 'application/javascript' }));
            pending = ctx.audioWorklet.addModule(url).finally(() => {
                URL.revokeObjectURL(url);
            });
            this.modules.set(name, pending);
        }
        return pending;
    }

    private unlock(): void {
        if (this.ctx) {
            if (this.ctx.state === 'suspended') void this.ctx.resume();
            return;
        }
        const ctx = new AudioContext();
        this.ctx = ctx;
        for (const cb of this.waiting) cb(ctx);
        this.waiting.length = 0;
    }
}
