import { Game } from './rally/game';

async function main(): Promise<void> {
    const game = await Game.create();
    game.start();
}

void main();
