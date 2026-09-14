# Remise d'aplomb de `packages/tile`

> Fait le 2026-09-14. Ce document reste comme argument des règles posées ; l'état courant est dans
> le code, `CLAUDE.md` et la spec technique 2.1.

Le module `tile` a été livré le 2026-09-13 en portant le modèle du POC 2 presque tel quel, puis en
greffant des services dessus. Le résultat tient les portes de qualité mais n'a pas la forme d'un
code de production : le sous-module `entity/`, censé n'être que le modèle de données, contient
sept services, une cinquantaine de fonctions libres et des fichiers qui mêlent types, constantes,
calcul et injection. Ce document dit ce qui ne va pas, la cible, et l'ordre dans lequel y aller.
Il s'applique aussi, en plus petit, à `packages/camera`, qui a la même dérive.

## 1. Constat

Inventaire de `packages/tile/src/entity` au commit `046152b` :

| Fichier          | Types et constantes                                                  | Fonctions libres                                                                       | Service         |
| ---------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------- |
| `units.ts`       | 5 constantes                                                         | 3 conversions                                                                          |                 |
| `face.ts`        | `Face`, `ExitFace`, `Turn`, `TurnKind`, 3 constantes                 | 7 (`isFace`, `faceIndex`, `oppositeFace`, `turnOf`, `turnKind`…)                       |                 |
| `profile.ts`     | `Profile`, `Zone`, 4 alias, 7 bornes                                 | 8 (`blockStart`, `zoneAt`, `zones`, `profileErrors`, `sameProfile`…)                   |                 |
| `grid.ts`        | `Cell`, `Heading`, `Pose`, `HEADING_OFFSETS`                         | 6 (`neighbor`, `cellKey`, `turnHeading`, `exitHeading`, `samePose`…)                   |                 |
| `layout.ts`      | `Vec2`, `FaceFrame`, `SIDE`, `APOTHEM`, `PITCH`                      | 13 (arithmétique `Vec2`, `cellToWorld`, `hexCorners`, `insideConvex`, cadres de face…) |                 |
| `path.ts`        | `PathSample`, `TransitionSpan`, 3 constantes                         | 10 (`localPath`, `worldPath`, `pathLength`, `transition`, `axisParameter`…)            |                 |
| `slope.ts`       | `MAX_SLOPE`, `GENERATOR_SLOPE_FACTOR`                                | 4 (`steffen`, `hermite`, `slopeOf`, `maxHeightSteps`)                                  |                 |
| `tile.ts`        | `Tile`, `TileProfiles`                                               |                                                                                        |                 |
| `environment.ts` | `Environment`, `EnvironmentId`, la palette                           |                                                                                        | `Environments`  |
| `sweep.ts`       | `TileSweep`, `Boundaries`                                            | 3 privées                                                                              | `TileSweeper`   |
| `geometry.ts`    | `SPoint`, `Slice`, `ZoneQuad`, `ZonePolygon`, `ZoneSide`, `HEX_AREA` | `polygonArea` + 1 privée                                                               | `TileGeometry`  |
| `obstacle.ts`    | `Obstacle` et ses 4 formes, `HazardSize`, `Footprint`, 3 constantes  | `describeObstacle` + 1 privée                                                          | `TileObstacles` |
| `checker.ts`     | `CheckerSquare`, `LINE_AT`                                           | 1 privée                                                                               | `TileLines`     |
| `surface.ts`     | `Surface`                                                            | 1 privée                                                                               | `TileSurfaces`  |
| `triangles.ts`   | `Vec3`, `Paint`, `Triangle3`, `TileBuild`                            | `toWorld` + 8 privées (`fan`, `wall`, `skirt`, `dedupe`…)                              | `TileTriangles` |

Ce qui ne va pas, par ordre de gravité :

1. **`entity/` n'est pas un modèle de données.** La spec technique 2.1 le définit comme « les
   modèles de données, sans dépendance vers Jolt ni three.js ». Il contient sept services Angular
   et toute la logique du module. Le nom ment, et la règle dependency-cruiser qui le protège
   (« entity ne lit ni three ni Jolt ») est la seule chose qui le distingue d'un dossier fourre-tout.
2. **Donnée et logique dans les mêmes fichiers.** `obstacle.ts` déclare les types d'obstacles, les
   constantes d'emprise, une fonction de libellé et le service qui calcule les emprises.
   `geometry.ts` déclare les types de tranches et le service qui les découpe. Un lecteur qui veut
   le vocabulaire lit du calcul ; un lecteur qui veut le calcul lit du vocabulaire.
3. **Une cinquantaine de fonctions libres exportées.** Faces, profils, grille, disposition, axe,
   pentes, unités : tout le POC est resté en fonctions, ce que la règle « DI partout » de
   `CLAUDE.md` refuse. L'option 1 du 2026-09-13 (services par capacité) n'a converti que ce qui
   avait un état ; le reste attend l'option 2.
4. **Un fichier ne porte pas le nom de ce qu'il contient.** `checker.ts` contient `TileLines`,
   `sweep.ts` contient `TileSweeper`, `geometry.ts` contient `TileGeometry` et six types. La
   convention hexact est un fichier par classe, nommé comme elle.
5. **L'arithmétique générale est dans `tile`.** `Vec2`, `add`, `scale`, `distance`, `Vec3`,
   `polygonArea`, `insideConvex`, `hermite` n'ont rien d'une tuile ; `commons/math` existe pour ça.
6. **Le barrel expose l'intérieur.** `index.ts` fait 130 lignes et ré-exporte `rightOf`,
   `insideConvex`, `HEX_AREA`, `toWorld`, `DEFAULT_TRANSITION`… Tout ce qui est exporté devient une
   surface à maintenir ; rien n'a été choisi.
7. **Les erreurs sont des chaînes.** `profileErrors`, `TileObstacles.errors` fabriquent des
   phrases anglaises dans le modèle. L'éditeur et la validation de `track` auront besoin d'un code,
   d'un emplacement (tuile, face, obstacle) et d'un message ; la phrase est une vue, pas une donnée.
8. **Aucune porte ne tient la forme.** Le lint interdit les constructeurs à paramètres et les
   chemins relatifs, dependency-cruiser tient les couches, mais rien n'empêche une fonction ou un
   service dans `entity/`. C'est ce qui a laissé passer tout le reste.
9. **`camera` a la même dérive, en petit** : `entity/rig.ts` est trois fonctions de calcul,
   `entity/camera-tuning.ts` est un service.

## 2. Cible

Quatre sous-modules dans `tile`, au lieu des trois de la spec technique 2.1, parce que la logique
pure en unités n'est ni de la physique ni du rendu et qu'elle n'a pas sa place dans le modèle :

```
packages/tile/src/
  entity/      la donnée seule : interfaces, alias, unions, constantes littérales. Aucun import
               hors entity/ et commons. Aucune fonction, aucune classe, aucun décorateur.
  geometry/    la logique en unités, sans three ni Jolt : un service par capacité, un fichier par
               service, nommé comme lui. Lit entity/ et commons.
  render/      TileMeshes. Lit entity/ et geometry/.
  physics/     TileBodies. Lit entity/, geometry/ et engine.
  index.ts     les types d'entity/ et les services ; rien d'autre.
```

Répartition visée :

| Aujourd'hui                                         | Destination                                                                                                                                                     |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Vec2`, `add`, `scale`, `distance`, `Vec3`          | `commons/math/vec2.ts`, `vec3.ts` : types et arithmétique sans état, comme `lerp` aujourd'hui                                                                   |
| `polygonArea`, `insideConvex`, `hermite`            | `commons/math`                                                                                                                                                  |
| `units.ts` constantes                               | `entity/units.ts` ; les conversions dans `geometry/units.ts` (`Units`)                                                                                          |
| `face.ts` types et constantes                       | `entity/face.ts` ; les 7 fonctions dans `geometry/faces.ts` (`Faces`)                                                                                           |
| `profile.ts` types et bornes                        | `entity/profile.ts` ; zones, bloc, égalité dans `geometry/profiles.ts` (`Profiles`) ; la validation à part                                                      |
| `grid.ts` types et `HEADING_OFFSETS`                | `entity/grid.ts` ; voisinage et caps dans `geometry/grid.ts` (`Grid`)                                                                                           |
| `layout.ts` `SIDE`, `APOTHEM`, `PITCH`, `FaceFrame` | `entity/layout.ts` ; `cellToWorld`, `hexCorners`, cadres de face dans `geometry/layout.ts` (`Layout`)                                                           |
| `path.ts` `PathSample`, `TransitionSpan`, rayons    | `entity/path.ts` ; l'axe et la transition dans `geometry/tile-paths.ts` (`TilePaths`)                                                                           |
| `slope.ts` seuils                                   | `entity/slope.ts` ; `steffen`, `slopeOf`, `maxHeightSteps` dans `geometry/slopes.ts` (`Slopes`)                                                                 |
| `environment.ts`                                    | `entity/environment.ts` (types et palette) ; `geometry/environments.ts` (`Environments`)                                                                        |
| `sweep.ts`                                          | `entity/sweep.ts` (`TileSweep`, `Boundaries`) ; `geometry/tile-sweeper.ts`                                                                                      |
| `geometry.ts`                                       | `entity/slice.ts` (`SPoint`, `Slice`, `ZoneQuad`, `ZonePolygon`, `ZoneSide`) ; `geometry/tile-geometry.ts`                                                      |
| `obstacle.ts`                                       | `entity/obstacle.ts` (types, emprises) ; `geometry/tile-obstacles.ts` ; `describeObstacle` devient une vue de l'erreur                                          |
| `checker.ts`                                        | `entity/line.ts` (`CheckerSquare`, `LINE_AT`) ; `geometry/tile-lines.ts`                                                                                        |
| `surface.ts`                                        | `entity/surface.ts` ; `geometry/tile-surfaces.ts`                                                                                                               |
| `triangles.ts`                                      | `entity/triangle.ts` (`Paint`, `Triangle3`, `TileBuild`) ; `geometry/tile-triangles.ts` ; `toWorld` dans `Units`                                                |
| erreurs en chaînes                                  | `entity/issue.ts` : `TileIssue { code, where, message }` ; `geometry/tile-validation.ts` (`TileValidation`) qui produit les `TileIssue` de profil et d'obstacle |

Ce que la cible ne change pas : les données restent des **interfaces**, pas des classes. Un objet
riche (`profile.blockStart()`) demanderait des constructeurs ou des fabriques que la règle « pas de
constructeur à paramètres » rend pénibles, et il remettrait la logique dans la donnée. La logique
vit dans les services, la donnée est inerte et sérialisable telle quelle, ce dont `track` (fichier
de piste) a besoin.

## 3. Les portes à poser d'abord

Le refactor se fait sous des portes qui refusent l'état actuel, pour qu'il ne revienne pas :

1. **Lint `entity` = donnée.** Une règle `no-restricted-syntax` sur `packages/*/src/entity/**` qui
   refuse `FunctionDeclaration`, `ClassDeclaration`, `ArrowFunctionExpression` au niveau du module
   et tout `Decorator`. Ne restent que `interface`, `type`, `enum` et `const` de littéraux.
2. **dependency-cruiser.** `entity/` n'importe que `entity/` et `@hexrace/commons` (pas même
   `@angular/core`) ; `geometry/` n'importe ni three ni Jolt ; `render/` et `physics/` ne se lisent
   pas (déjà tenu). La règle actuelle « entity ne lit ni three ni Jolt » s'étend à `geometry/`.
3. **Un fichier par service, nommé comme lui.** Lint `hexrace/one-class-per-file` (ou la règle
   `max-classes-per-file: 1` d'ESLint plus une vérification du nom en kebab-case dans
   `hexrace/directory-size`, qui parcourt déjà les fichiers).
4. **Barrel minimal.** knip signale déjà les exports inutilisés ; passer `ignoreExportsUsedInFile`
   à faux et retirer du barrel tout ce qu'aucun autre package ni l'application ne lit.

## 4. Étapes

Dans cet ordre, chaque étape laissant `make check` vert. Fait en une passe le 2026-09-14, sur les
trois réponses de la section 5 ; les étapes restent la lecture recommandée du diff. Deux écarts au
plan : `inputs` avait la même dérive (`InputActions` en classe, jeton Angular dans `entity/`) et a
été traité avec ; la porte 4 (knip sur les exports du barrel) n'est pas activée, parce qu'elle
retirerait les types du modèle que `track` va lire la semaine prochaine, le barrel a été réduit à la
main aux types d'`entity/`, aux constantes de la spec et aux services.

| #   | Étape                                                                                                                                                                          | Fini quand                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| 1   | Poser les portes de la section 3 ; elles sont rouges sur `tile` et `camera`, et vertes ailleurs                                                                                | `make quality` liste exactement les écarts de ce document |
| 2   | `commons/math` reçoit `Vec2`, `Vec3` et leur arithmétique, `polygonArea`, `insideConvex`, `hermite`, avec tests                                                                | `tile` et `camera` n'ont plus d'arithmétique générale     |
| 3   | Créer `geometry/` et y déplacer les sept services existants, un fichier par service ; `entity/` ne garde que leurs types                                                       | La porte 1 ne signale plus que les fonctions libres       |
| 4   | Convertir les fonctions libres en services : `Units`, `Faces`, `Profiles`, `Grid`, `Layout`, `TilePaths`, `Slopes` ; adapter les services qui les appelaient pour les injecter | Plus aucune fonction exportée dans `tile` ; porte 1 verte |
| 5   | `TileIssue` et `TileValidation` remplacent les chaînes d'erreur ; la vitrine affiche les messages depuis les issues                                                            | `profileErrors` et `TileObstacles.errors` n'existent plus |
| 6   | Barrel : ne garder que les types d'`entity/` et les services ; knip vert avec la porte 4                                                                                       | `index.ts` sous 60 lignes                                 |
| 7   | Même traitement pour `camera` : `entity/` garde `CameraTarget`, `RigPose` ; `RigSolver` et `CameraTuning` passent dans `follow/`                                               | Portes vertes sur `camera`                                |
| 8   | Docs : spec technique 2.1 (quatre sous-modules), `CLAUDE.md` (règle entity = donnée, un fichier par service), plan de construction (fiches 2.4 et 2.5), registre des décisions | Relecture du dépôt sans surprise                          |

Ce que le refactor ne touche pas : le comportement. Les tests existants sont la référence ; ils
changent de forme (`TestBed.inject` au lieu d'un appel de fonction) mais gardent leurs attentes,
et la vitrine `lab/tile` doit rendre la même tuile à la fin.

## 5. Questions à trancher avant l'étape 4

- **Granularité des services.** `Faces`, `Grid`, `Layout`, `Slopes` sont petits (quatre à sept
  méthodes sans état). Un service par famille (proposé ici) ou un seul `TileMath` ? Un par famille
  garde les noms lisibles au point d'appel (`this.faces.turnOf(exit)`). **Tranché : un service par
  famille.**
- **`Vec2` dans `commons`.** Fonctions libres (`add`, `scale`) comme `lerp` aujourd'hui, ou une
  classe `Vec2` immuable avec méthodes ? L'arithmétique de vecteurs est le cas où des méthodes
  lisent mieux (`a.add(b).scale(k)`), mais c'est une classe à constructeur. **Tranché : `Vec2` et
  `Vec3` immuables avec méthodes, la règle sans constructeur levée sur `commons/math` seulement.**
- **Où va `TileBuild`.** C'est la commande passée à `TileTriangles` (sweep, obstacles, ligne,
  base de jupe). Donnée, donc `entity/`, ou paramètre propre au service, donc `geometry/` ?
  **Tranché : donnée brute sans logique, donc `entity/`.**
