# CLAUDE.md

POC jetable, copie de `rally-game`. Mêmes conventions que l'original (Prettier 4 espaces / 100 col,
TypeScript strict, `import type`), mais pas de refactoring : on valide des idées, on ne construit
pas le vrai jeu.

- `src/engine/` — framework générique (GameObject / Component, Physics Jolt, input, debug).
- `src/rally/car/` — la voiture (`createCar`, `CarBehavior`).
- `src/rally/terrain/` — heightmap + piste + matériau.

`make lint` et `make build` doivent passer.
