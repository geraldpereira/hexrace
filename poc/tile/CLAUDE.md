# CLAUDE.md

POC jetable : le terrain hexagonal seul, sans voiture ni Jolt. Mêmes conventions que `poc/car`
(Prettier 4 espaces / 100 col, TypeScript strict, `import type`), pas de refactoring : on valide le
modèle de tuile, l'assemblage et la génération, on ne construit pas le vrai package `tile`.

- `src/model/` — le domaine en TypeScript pur, sans three.js : faces, profils, tuiles, pistes.
  Testé avec vitest, c'est le seul code du POC qui a des chances de survivre.
- Le mot est « tile », jamais « hex ».

`make lint`, `make test` et `make build` doivent passer.
