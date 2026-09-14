/**
 * Qui a le droit de lire qui. Une règle par ligne, avec son argument. Lancé depuis chaque package
 * (`make quality-layers`), donc les chemins sont relatifs à `src/` du package courant et les
 * packages voisins apparaissent en `../<nom>/src/`.
 */
export default {
  forbidden: [
    {
      name: 'no-circular',
      comment:
        'Deux fichiers qui ont besoin l’un de l’autre sont un seul fichier ; un cycle de types seuls ' +
        '(GameObject et Component se nomment) est admis.',
      severity: 'error',
      from: {},
      to: { circular: true, viaOnly: { dependencyTypesNot: ['type-only'] } },
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
      name: 'entity-is-data-only',
      comment:
        'Le sous-module `entity` d’un package est le modèle de données : il ne lit que lui-même et ' +
        '`commons` (spec technique 2.1, docs/remise-d-aplomb-tile.md).',
      severity: 'error',
      from: { path: '^src/entity/', pathNot: '\\.(spec|mock)\\.ts$' },
      to: { pathNot: '^src/entity/|/commons/src/', dependencyTypesNot: ['type-only'] },
    },
    {
      name: 'geometry-knows-no-engine',
      comment:
        'Les sous-modules de logique en unités (`entity`, `geometry`, pour la piste `format` ' +
        'et `generation`, pour la voiture `drive` et `audio`) ne lisent ni three.js ni Jolt : ils ' +
        'restent testables seuls (spec technique 2.1).',
      severity: 'error',
      from: {
        path: '^src/(entity|geometry|format|generation|drive|audio)/',
        pathNot: '\\.(spec|mock)\\.ts$',
      },
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
