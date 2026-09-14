# HexRace - comment travailler dans ce dépôt

Rally arcade sur tuiles hexagonales, dans le navigateur, manette et tactile. Ce fichier dit comment
_coder_ ici ; il ne raconte pas l'architecture et ne répète rien qu'un autre fichier dit déjà.

## Où regarder

| Question                                          | Où c'est répondu                                                              |
| ------------------------------------------------- | ----------------------------------------------------------------------------- |
| Qu'est-ce que le jeu, pour le joueur ?            | `docs/specs-fonctionnelles.md`                                                |
| Comment est-il construit, qui possède quoi ?      | `docs/specs-techniques.md`                                                    |
| Dans quel ordre, et quand un module est-il fini ? | `docs/plan-de-construction.md`                                                |
| Qu'est-ce que je peux lancer ?                    | `make`, qui liste chaque cible avec sa phrase                                 |
| À quoi sert ce module, que refuse-t-il ?          | son `index.ts`, en cinq lignes                                                |
| Qui a le droit de lire qui ?                      | `.dependency-cruiser.js`, une règle par ligne avec son argument               |
| Quelles règles de lint, et pourquoi ?             | `eslint.config.js`, et `quality/` pour la règle maison                        |
| Seuils de couverture, plafond de duplication ?    | 100 % partout : `packages/*/vitest.config.ts`, `angular.json` ; `.jscpd.json` |

## Commandes

Toujours par le Makefile : il épingle Node 24 via nvm, qu'Angular 22 exige et que le shell ambiant
n'a généralement pas. `make check` est le quotidien, toutes les portes puis toutes les suites ;
`make serve` sert l'application sur http://localhost:4300, `make serve-lan` l'expose à un téléphone.

## Les règles qui ne sont écrites nulle part ailleurs

- **DI Angular partout, pas de constructeur à paramètres.** Chaque classe d'un package est un service
  `@Injectable({ providedIn: 'root' })` qui obtient ses dépendances par `inject()`. Les tests passent
  par `TestBed` et remplacent des jetons. Le lint le tient (`no-restricted-syntax` sur les
  constructeurs). Seule exception : les objets-valeurs `Vec2` et `Vec3` de `commons/math`.
- **`entity/` est de la donnée, rien d'autre** : interfaces, alias, unions, constantes littérales.
  Ni fonction, ni classe, ni décorateur, ni import d'Angular, de three ou de Jolt ; le lint et
  dependency-cruiser refusent le reste. La logique vit dans des services d'un autre sous-module
  (`geometry/` pour la tuile, `merge/` pour les entrées, `follow/` pour la caméra).
- **Un fichier, une classe, nommée pareil** (`hexrace/one-class-per-file`) : `TileSweeper` vit dans
  `tile-sweeper.ts`.
- **Pas de fonction au niveau du module dans un package.** Une capacité est une méthode d'un
  service, une aide privée une méthode privée ; même l'arithmétique est un service (`Maths`,
  `Polygons` dans `commons`). Le lint le tient (`no-restricted-syntax`) ; seule exception, les
  fabriques de providers Angular nommées `provide*`. Dans `apps/web`, un `provide*` ou une fonction
  de test restent admis.
- **Les doublures et les données de test vivent dans des `*.mock.ts`**, à côté de l'entité ou du
  service qu'elles doublent, jamais déclarées dans un spec : `profile.mock.ts`, `sweep.mock.ts`,
  `game-component.mock.ts`, `apps/web/src/app/testing/`. Les mocks échappent à la couverture et aux
  règles de forme.
- **Un module, une vitrine.** Un module n'est fini que quand sa page `lab/<module>` tourne. La liste
  est dans `apps/web/src/app/lab/showcases.ts` ; on y passe `ready: true` quand la route existe.
- **Le mot est « tile », jamais « hex ».** En anglais, _hex_ est aussi une malédiction.
- **On se lit par son nom.** `@hexrace/<package>` pour un voisin, `@<package>/*` chez soi, `@ui/*` dans
  l'app. Jamais de chemin relatif : le lint refuse `./` et `../`.
- **Anglais dans le code, les commentaires, les tests et ce que le joueur lit ; français dans les
  docs et les commits.** La spec fonctionnelle 9.4 veut un jeu en anglais, texte minimaliste ;
  identifiants, noms de fichiers, commentaires et titres de specs suivent.
- **Aucun `any`, même implicite** : `make quality-types` (type-coverage) exige 100 %. Un paramètre de
  lambda que l'inférence laisse en `any` s'annote.
- **Un dossier se lit d'un coup d'œil** (`hexrace/directory-size`, reprise de hexact) : plus de 20
  fichiers avertit, plus de 30 refuse ; specs et mocks ne comptent pas.
- **Les commentaires sont rationnés** (`hexrace/comment-ration`, reprise de hexact, arguée dans
  `quality/README.md`). Une classe ou une interface : 5 lignes ; une entité : 4 ; une méthode
  publique : 2 ; un champ public ou un alias de type : 1 ; un membre privé : rien ; un barrel : 5.
  Pas de commentaire dans le corps d'une fonction, sauf un lien vers une spec ou un mot sur un bloc
  vide voulu. Aucun dans les specs. Ce qui ne tient pas dans la ration va dans l'en-tête de la
  classe, ou réclame un meilleur nom.
- **`poc/` n'est pas le jeu.** Matière première à reprendre module par module ; rien ne l'importe.

## Les modules

```
packages/commons/  @hexrace/commons - EventBus typé par augmentation, Random et RngFactory, Maths et
                                     Polygons, objets-valeurs Vec2 et Vec3.
packages/inputs/   @hexrace/inputs - les entrées : actions, manette / clavier / tactile, fusion.
packages/engine/   @hexrace/engine - boucle à pas fixe, scènes et injecteur enfant, GameObject et
                                     GameComponent, ThreeRenderer, JoltPhysics et JoltConversions.
packages/camera/   @hexrace/camera - la caméra de suivi : CameraTarget et RigPose (entity/),
                                     RigSolver, CameraTuning et FollowCamera (follow/).
packages/tile/     @hexrace/tile   - la tuile : la donnée (entity/), la logique en unités en services
                                     par capacité (geometry/ : TileSweeper, TileGeometry,
                                     TileSurfaces, TileValidation…), TileMeshes (render/),
                                     TileBodies (physics/).
packages/track/    @hexrace/track  - la piste : placement sur la grille, pentes aux faces, marques de
                                     départ, validation (geometry/), fichier .track (format/),
                                     générateur à graine (generation/), TrackMeshes, TrackBodies.
packages/car/      @hexrace/car    - la voiture : entity/ (caractéristiques, options de garage, tableau
                                     par revêtement), drive/ (boîte, moteur, assistances, grain),
                                     physics/ (CarBodies, CarController), render/ (caisse, traces,
                                     particules), audio/ (les quatre couches procédurales du POC 1).
packages/hud/      @hexrace/hud    - le seul package à composants et pipes : game/ (compte-tours,
                                     dégâts, chrono…), commons/ (cadre de canvas, cartes, pipe time),
                                     dialog/, debug/ (les services autour de lil-gui). Testé par
                                     `ng test hud`, pas par Vitest seul.
apps/web/          @hexrace/web    - l'application Angular 22 : le lab des vitrines, puis le jeu.
```

Un package ajouté se déclare dans `make/quality.mk` (PROJECTS), `eslint.config.js` (project),
`knip.json` (workspaces), les `paths` de `apps/web/tsconfig.json`, et ici. Ses tests tournent sous
Vitest avec jsdom ; `test-setup.ts` charge le compilateur JIT d'Angular et une plateforme de test,
sans quoi les `@Injectable` ne s'exécutent pas.
