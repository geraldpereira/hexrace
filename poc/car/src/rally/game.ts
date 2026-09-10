import { PHYSICS_TIMESTEP } from '../engine/physics';
import type { Debug } from '../engine/debug/debug';
import { GameLoop } from '../engine/gameLoop';
import { GameManager } from './gameManager';

/** Top-level orchestrator: owns physics, rendering, input, and the game loop. */
export class Game {
    private readonly gameLoop: GameLoop;

    private constructor(
        private readonly gameManager: GameManager,
        private readonly debug?: Debug,
    ) {
        this.gameLoop = new GameLoop({
            fixedTimestep: PHYSICS_TIMESTEP,
            fixedUpdate: () => {
                this.gameManager.fixedUpdate();
            },
            render: (dt) => {
                this.gameManager.render(dt);
            },
            beforeFrame: () => this.debug?.stats.begin(),
            afterFrame: () => this.debug?.stats.end(),
            onPanic: () => {
                console.warn('Game loop hit max-steps cap; dropping accumulator.');
            },
        });
    }

    static async create(): Promise<Game> {
        let debug: Debug | undefined;
        if (import.meta.env.DEV) {
            const { Debug: DebugClass } = await import('../engine/debug/debug');
            debug = new DebugClass();
        }
        const gameManager = await GameManager.create(debug);
        return new Game(gameManager, debug);
    }

    start(): void {
        this.gameLoop.start();
    }

    stop(): void {
        this.gameLoop.stop();
    }
}
