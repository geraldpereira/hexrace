/**
 * Qui a le droit de lire qui. Une règle par ligne, avec son argument. Lancé depuis chaque package
 * (`make quality-layers`), donc les chemins sont relatifs à `src/` du package courant et les
 * packages voisins apparaissent en `../<nom>/src/`.
 */
export default {
  forbidden: [
    {
      name: 'no-circular',
      comment: 'Deux fichiers qui ont besoin l’un de l’autre sont un seul fichier.',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
    {
      name: 'a-package-is-reached-by-its-name',
      comment:
        'Un package voisin se lit par son barrel (`@hexrace/<nom>`), jamais par un fichier dedans : ' +
        'le barrel est la surface derrière laquelle on peut tout réécrire.',
      severity: 'error',
      from: { path: '^src/' },
      to: { path: '(packages|\\.\\.)/[a-z-]+/src/', pathNot: '/src/index\\.ts$' },
    },
    {
      name: 'entity-knows-no-engine',
      comment:
        'Le sous-module `entity` d’un package est le modèle de données : il ne lit ni three.js ni ' +
        'Jolt, ce qui le rend testable seul (spec technique 2.1).',
      severity: 'error',
      from: { path: '^src/entity/' },
      to: { path: 'node_modules/(three|jolt-physics)/' },
    },
    {
      name: 'physics-and-render-do-not-meet',
      comment:
        '`physics` et `render` ne se lisent pas l’un l’autre ; ce qu’ils ont à se dire passe par ' +
        '`entity` (spec technique 2.1).',
      severity: 'error',
      from: { path: '^src/(physics|render)/' },
      to: { path: '^src/(physics|render)/', pathNot: '^src/$1/' },
    },
    {
      name: 'nobody-reads-the-hud',
      comment: 'Le hud lit tous les packages ; aucun package ne lit le hud (spec technique 2.2).',
      severity: 'error',
      from: { path: '^src/', pathNot: '^src/app/' },
      to: { path: '(packages|\\.\\.)/hud/src/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: { exportsFields: ['exports'], conditionNames: ['import', 'default'] },
  },
};
