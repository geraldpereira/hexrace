# HexRace - Spécifications techniques

> Comment on construit ce que décrivent les [spécifications fonctionnelles](specs-fonctionnelles.md).

Ce document dit **comment** le jeu est fait : les briques choisies, leur découpage, ce que chaque module possède et ce qu'il refuse. Il ne redit pas ce que le jeu est pour le joueur. Quand une section renvoie à un numéro entre crochets, par exemple [F 2.6], c'est la section correspondante de la spec fonctionnelle.

## Comment utiliser ce document

Les chapitres 1 et 2 sont rédigés, ainsi que quelques sections plus loin. Le reste est encore un sommaire : chaque section porte en italique la question à laquelle elle doit répondre. Mêmes balises que la spec fonctionnelle :

- **`<TODO>`** : c'est décidé, il reste à l'écrire ou à le préciser.
- **`<CHOIX>`** : ce n'est pas décidé, les options sont posées à la suite, il faut trancher avant de coder.
- **`<GPE>`** : une réponse de Gérald laissée dans le fichier entre deux passages, fondue ensuite dans le texte.

Deux projets voisins servent de référence : **rally-game** (three.js, Jolt, Vite, un jeu de moto 3D) et **hexact** (Angular, monorepo de packages purs, chaîne qualité, Makefile, déploiement Cloudflare).

---

## 1. Choix fondateurs

### 1.1 Ce qu'on reprend de rally-game

- **La physique** : l'intégration de Jolt, le corps véhicule sous contrainte, la boucle à pas fixe avec accumulateur (`engine/gameLoop.ts`), et le système GameObject / GameComponent (`engine/gameObject.ts`, `engine/components.ts`) qui assemble maillage et corps physique.
- **La gestion des contrôles** : l'interface `InputSource` avec ses implémentations clavier et manette, fusionnées en un instantané d'entrées lu par le jeu au début de chaque pas.

Ce qu'on ne reprend pas :

- **L'audio** : il n'y a rien à reprendre. Howler et Tone sont dans les dépendances de rally-game mais le dossier `src/audio` est vide, aucun son n'a été écrit.
- ~~**L'outillage de debug**~~ : finalement repris (décision du 2026-09-13) : lil-gui et les ajouts du POC voiture (éditeur de courbes, persistance, export) font le panneau de debug, enveloppés dans le sous-module `hud/debug`. Le joueur ne le voit jamais, on ne le redéveloppe pas.

### 1.2 Ce qu'on reprend de hexact

Tout : le découpage en packages sous `packages/`, Angular pour les écrans, la chaîne qualité (ESLint, dependency-cruiser, jscpd, knip, couverture), le Makefile comme registre des commandes avec Node épinglé, et le déploiement Cloudflare quand il sera temps.

### 1.3 Moteur de rendu

**three.js**, rendu **WebGL2**.

Les alternatives regardées et écartées :

- **Babylon.js** : un moteur complet (scène, physique, GUI, inspecteur), plus lourd au chargement, et on perdrait l'intégration Jolt déjà écrite pour three.js dans rally-game.
- **PlayCanvas** : moteur open source avec éditeur en ligne ; l'éditeur pousse vers son écosystème plutôt que vers notre pipeline de tuiles paramétrées.
- **WebGL ou WebGPU à nu** : tout à réécrire, sans intérêt pour un jeu low poly.

**WebGL2 contre WebGPU.** WebGPU réduit le coût CPU par appel de rendu et ouvre les compute shaders. Pour un jeu low poly de quelques centaines d'appels de rendu, l'écart est négligeable : sur mobile le goulot sera le remplissage de pixels et le post-traitement, pas l'API. Côté support en 2026, WebGPU est présent sur Chrome et Edge (desktop et Android), Safari 26 (macOS et iOS) et Firefox récent, mais pas sur toutes les combinaisons GPU / pilote Android ; WebGL2 est partout. three.js propose un `WebGPURenderer` qui retombe sur WebGL2 quand WebGPU manque, mais avec son propre système de matériaux (TSL). On part donc sur le `WebGLRenderer` classique, et on regardera `WebGPURenderer` seulement si un profil de performance le justifie.

### 1.4 Moteur physique

**Jolt Physics** (build wasm `jolt-physics`), comme rally-game. Jolt est le moteur intégré à Godot depuis la 4.4, où il remplace progressivement GodotPhysics : c'est un moteur de production, avec un contrôleur véhicule à roues éprouvé (voir 4.1).

<TODO> Mesurer le poids du wasm et son temps d'initialisation sur mobile ; en faire une des métriques du POC 1.

### 1.5 Écrans et interface

**Angular**, comme hexact, et **partout** : tous les packages sont des bibliothèques Angular faites de services `@Injectable({ providedIn: 'root' })` ; seul le package `hud` contient des composants et des templates. Le canvas three.js est un élément persistant, les écrans Angular vivent par-dessus ou à côté. Angular Material est envisageable pour les menus.

### 1.6 Toolchain

Comme hexact : TypeScript strict, Angular build pour l'application et Vitest pour les packages, Node épinglé par nvm, Makefile comme registre des commandes.

---

## 2. Architecture

### 2.1 Découpage en packages

**Le mot est « tile ».** On n'emploie pas « hex » dans le code : en anglais, _hex_ est aussi une malédiction.

Briques techniques :

| Package  | Ce qu'il possède                                                                                                         |
| -------- | ------------------------------------------------------------------------------------------------------------------------ |
| `inputs` | L'interface d'entrées et ses trois implémentations : manette, clavier, tactile. Repris de rally-game.                    |
| `camera` | La caméra qui suit le joueur, dont la hauteur suit la vitesse et qui s'oriente vers la prochaine tuile [F 3.9].          |
| `hud`    | **Le seul package avec des composants Angular.** Sous-modules : `commons`, `menus`, `game`, `editor`, `dialog`, `debug`. |

Briques fonctionnelles :

| Package  | Ce qu'il possède                                                                                                                                      |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tile`   | Une tuile : son modèle de données, son modèle physique et son modèle 3D.                                                                              |
| `car`    | Une voiture : modèle de données (type, améliorations), affichage, modèle physique.                                                                    |
| `track`  | L'assemblage de tuiles en piste, le format de fichier, l'affichage et le masquage des tuiles selon la position et le rythme du joueur [F 9.2, F 4.4]. |
| `editor` | L'assemblage d'une piste à la main [F 5.2].                                                                                                           |
| `game`   | Un module par mode (`track`, `rally`, `collapse`) et un module `game-commons` pour le tronc commun [F 4.1].                                           |

**Sous-modules.** `tile` et `car` mêlent modèle de données, logique en unités, physique et 3D. Comme dans hexact, où un package est fait de dossiers sous `src/` exposés par un seul `index.ts`, chacun se découpe en quatre sous-modules (précisé le 2026-09-14, [remise d'aplomb](remise-d-aplomb-tile.md)) :

- `entity` : **la donnée seule**, interfaces, alias, unions et constantes littérales. Ni fonction, ni classe, ni décorateur, ni Angular ; n'importe que lui-même et `commons`. Le lint et dependency-cruiser le tiennent ;
- `geometry` : la logique en unités, sans Jolt ni three.js, en services par capacité, un fichier par service nommé comme lui ; lit `entity` et `commons` ;
- `physics` : le modèle physique, lit `entity` et `geometry` ;
- `render` : le modèle 3D, lit `entity` et `geometry`.

`physics` et `render` ne se lisent pas l'un l'autre : ce qu'ils ont à se dire passe par `entity` et `geometry`. Les règles sont tenues par dependency-cruiser (2.2). Un package sans 3D ni physique (`inputs`, `camera`) garde le même `entity` de donnée pure et met sa logique dans un sous-module nommé pour elle (`merge`, `follow`) ; le sous-module de logique de `car` s'appelle `drive`, et son `audio` ne lit lui non plus ni three.js ni Jolt.
On peut voir a faire en sorte que chaque module puisse être testé dans le navigateur avec une petite appli de test: car affichera une voiture on fonction de son data model, tiles idem, etc

### 2.2 Assemblage, dépendances et injection

**Des scènes, comme Unity et Godot.** On reprend le système GameObject / GameComponent de rally-game et on le complète d'une notion de scène : une scène assemble les composants d'un écran (la course, l'éditeur, le garage). Changer d'écran, c'est décharger une scène et charger la suivante.

**Des interfaces, des implémentations injectées.** Chaque package expose des interfaces et des jetons ; les implémentations sont fournies de l'extérieur. C'est ce qui rend les tests faciles : des entrées scriptées, un HUD nourri de fausses valeurs. Deux exceptions assumées (2026-09-13) : three.js et Jolt ne sont pas remplaçables, le jeu parle leur langue partout où il construit des maillages et des corps, donc `ThreeRenderer` et `JoltPhysics` sont des services nommés pour ce qu'ils sont, sans interface qui ferait semblant de les cacher. Le wasm de Jolt se charge sous Vitest, les tests de physique tournent sur le vrai ; WebGL n'existe pas sous jsdom, les tests de rendu remplacent `WebGLRenderer` par `vi.mock` ou espionnent `render`.

**Un EventBus pour le transverse.** Ce qui traverse les modules sans lien direct (une collision qui doit faire du bruit, allumer un dégât et secouer la caméra) passe par un bus d'événements typé, pas par des dépendances croisées.

**Injection de dépendances Angular partout.** Le code de rally-game souffrait de son absence de DI ; on ne refait pas cette erreur. Tant qu'on a Angular, on l'utilise jusqu'au bout :

- chaque package est une **bibliothèque Angular** et ses classes sont des services `@Injectable({ providedIn: 'root' })`, qui obtiennent leurs dépendances par `inject()` ;
- les interfaces sont fournies par des `InjectionToken`, et l'implémentation choisie (physique Jolt ou factice, entrées manette ou scriptées) est décidée par un provider, jamais par le code qui consomme ;
- seul le `hud` contient des **composants** ; partout ailleurs il n'y a que des services, sans DOM ni template ;
- ce qui a une durée de vie plus courte que l'application (une course, une scène de l'éditeur) vit dans un **injecteur enfant** créé pour la scène (2.2, scènes) et détruit avec elle, ce qui fait le ménage des corps physiques et des maillages.

Les tests instancient les services via `TestBed` ou `runInInjectionContext`, en remplaçant les jetons par des doublures. Le mot « pur » dans ce document désigne un package **sans DOM, sans three.js et sans Jolt**, pas un package sans Angular.

**L'EventBus, écrit (2026-09-13, `packages/commons`).** Un service `EventBus` dont les noms d'événements et leurs charges sont les clés de l'interface `HexraceEvents`, vide dans `commons` et augmentée par chaque package qui publie (`declare module '@hexrace/commons' { interface HexraceEvents { 'car/collision': Collision } }`). Le bus reste ainsi typé de bout en bout sans que `commons` connaisse un seul événement. `publish` est synchrone et appelle les abonnés dans l'ordre d'inscription ; `on` rend la désinscription ; `once` s'en va après un appel. Le même package porte `Random`, seule source d'aléa (`seeded` rejouable, `fresh` pour les effets), et l'arithmétique partagée.

**Dépendances autorisées** : une règle par ligne dans dependency-cruiser, comme hexact. Le `hud` peut lire tous les packages ; aucun package ne lit le `hud`.

<TODO> Écrire la liste des règles, y compris celles entre sous-modules `entity` / `physics` / `render` (2.1).

### 2.3 Frontières

_Domaine / physique / rendu / entrées / interface : où passe la donnée, qui possède la vérité sur la position de la voiture._

### 2.4 Boucle de jeu

Pas fixe pour la physique, rendu à la fréquence de l'écran, interpolation entre deux pas : la boucle à accumulateur de rally-game, avec sa borne sur le temps rattrapé par image.

**Perte de focus.** Il n'y a pas de pause [F 4.1], donc perdre le focus ne suspend pas la partie. Le navigateur arrête les images d'un onglet caché ; au retour, on ne simule pas la physique manquante (la voiture reste où elle était) mais on **applique le temps écoulé** : le chrono avance de la durée réelle, et en Collapse le front de disparition avance d'autant, ce qui mènera vite à la défaite. C'est voulu.

**Écrite (2026-09-13, `packages/engine`).** `GameLoop` : pas fixe de 1/60 s, image plafonnée à 0,1 s,
cinq pas au plus par image puis l'accumulateur est vidé (`onPanic`) ; `alpha` (0..1) dit où se place le
rendu entre les deux derniers pas et `BodyComponent` interpole position et rotation du maillage avec.
L'ordre par image est : mise à jour fixe de la scène (qui relève la pose de départ), pas Jolt, puis
rendu. `stepMs` et `frameMs` nourrissent le compteur de performance du `hud`, branché par l'application.

### 2.5 État de partie et modes

**Écrit (2026-09-14, `packages/game-commons`).**

**La machine.** Trois phases, et pas de pause [F 4.1] : `countdown`, `racing`, `finished`. `RaceMachine` les tient dans un `RaceState` que le HUD et la vitrine lisent chaque image et que personne d'autre que le directeur n'écrit : phase, pas du compte à rebours (3, 2, 1, puis 0 pour le GO, puis null), chrono, tour courant sur N, sens interdit, et la **position continue** sur la piste. `start()` remet l'état à zéro et lance le compte à rebours ; `update()` est appelée une fois par pas fixe avec la position du moment et ne fait rien de plus que lire l'horloge et compter les franchissements.

**L'horloge est réelle, pas simulée.** `CountdownTimer` et `RaceClock` lisent `Clock` de `commons`, c'est-à-dire `Date.now()` derrière un jeton qu'un test remonte à la main. C'est la conséquence directe de 2.4 : un onglet caché ne simule pas la physique manquante mais **applique le temps écoulé**, donc le chrono avance pendant qu'on regarde ailleurs. Corollaire : le compte à rebours dure trois secondes de montre, quel que soit le nombre d'images rendues.

**Où vit le chrono.** Dans `RaceClock`, et nulle part ailleurs : il démarre au GO, s'arrête à l'arrivée et garde ensuite le temps final. `RaceState.elapsedMs` n'en est que la copie de l'image courante, pour le HUD.

**Qui déclare la fin.** `RaceMachine`, sur un franchissement de ligne et sur rien d'autre. `LapCounter` compare la position d'avant et celle d'après le pas : sur une boucle il prend **le plus court chemin**, donc un aller-retour sur la ligne ne compte aucun tour, et une marche arrière retire le tour qu'elle avait donné. En Track la course finit quand le dernier tour se referme sur la ligne de départ ; en Rally, sur la ligne d'arrivée de la dernière tuile. La fin arrête le chrono, propose le temps à `BestTimes` (9.1) et publie l'événement ; c'est à l'écran, pas à la machine, d'ouvrir la boîte de résultats [F 4.5].

**Les événements du bus.** `race/start` (le GO est donné, avec le nombre de tours), `race/lap` (un tour bouclé, le tour courant et le total), `race/finish` (le temps final et s'il bat le record), `race/fall` (la voiture est sortie du terrain, avec la tuile où elle est reposée) et `race/cut` (elle a sauté une tuile, avec celle d'où elle vient et celle qu'elle visait). Le HUD, le son et les menus s'y branchent ; la machine ne connaît aucun d'eux.

**Le pont avec la scène.** `RaceDirector` est un `GameComponent` : il situe la voiture sur la piste (`TrackLocator`), déplace la fenêtre de tuiles, remplit le point que la caméra vise [F 3.9], gèle la voiture tant que le GO n'est pas donné, passe la position à la machine et remet la voiture sur la piste quand elle tombe (4.7). Une course est donc une scène qui porte un `TrackStage`, une `CarController` et un `RaceDirector`, dans cet ordre : le directeur tique en dernier et voit la position du pas courant.

**Le point visé est continu (2026-09-15).** `aim` demande à `TrackWindow.playerPose` la pose à `position + 1`, une tuile devant la **position continue** de la voiture, et non le milieu de la tuile d'index suivant : le point glisse au lieu de sauter d'une tuile entière à chaque face franchie [F 3.9]. Sur une piste ouverte `cursorAt` borne à la dernière tuile, donc le point s'arrête à l'arrivée au lieu de disparaître. La caméra lisse déjà œil et visée (`smoothing`) ; rien n'a changé dans `packages/camera`.

**Le raccourci (2026-09-15).** À chaque pas, l'écart entre la tuile que le locateur trouve et la dernière tuile parcourue est mesuré — le plus court chemin modulo le nombre de tuiles sur une boucle, par `LapCounter.step`, une simple différence sur une piste ouverte. Au-delà de 1, la voiture a sauté une tuile en coupant : l'index n'est pas adopté, la position ne bouge pas (donc aucun tour n'est compté), la voiture est reposée sur la dernière tuile et `race/cut` est publié [F 3.8]. La chute est jugée d'abord : une voiture repêchée publie `race/fall` et jamais `race/cut`. Corollaire nécessaire : `car.home` suit désormais la voiture de tuile en tuile, si bien qu'un reset manuel la repose sur la dernière tuile parcourue comme la spec le demande, et ne ressemble donc jamais à un raccourci.

**Où l'on repose une voiture (2026-09-15).** `SpawnSpots` cherche la première place libre d'une tuile : le point demandé, puis 0,15 et 0,3 plus loin sur l'axe — jamais en arrière, pour qu'un départ ne repasse pas derrière la ligne —, et pour chaque, des décalages en travers de 0, ±0,5, ±1 et ±1,5 unité, retenus tant que la demi-largeur de la voiture tient encore sur la piste. Une place est libre quand le rectangle du châssis, orienté par la direction de marche, ne recouvre l'emprise d'aucun obstacle solide (`hazard`, `barrier`, `ramp`, `bump` ; une `patch` se roule). Les emprises de `TileObstacles` sont des échelles — bord gauche à l'aller, bord droit au retour — donc elles se découpent en quadrilatères successifs, chacun convexe, et le recouvrement se teste par `Polygons.insideConvex` dans les deux sens, coins et centres. Rien de libre : le centre, comme avant. Le service sert à la remise **et** au placement de départ, une tuile de départ pouvant porter un obstacle.

**Le fondu des tuiles (2026-09-15).** `TrackStage` ne détruit plus une tuile qui quitte la fenêtre : il lui donne une cible d'opacité de 0 et la descend en 0,4 s, puis seulement libère maillage et corps Jolt ensemble ; une tuile qui entre part de 0 et monte de même [F 9.2]. `TileFader` tient la mécanique et **aucun état** : il reçoit une tuile et un `dt`, avance son opacité et la peint sur chaque matériau du groupe three (transparence coupée à 1 pour ne pas troubler le tri). C'est `TrackStage`, instancié par scène, qui garde la liste, ce qui permet à un service racine de servir toutes les scènes et à une tuile reprise de repartir de son opacité courante. `shown` ne compte que les tuiles vivantes ; `load` et `clear` détruisent tout sans fondu.

**Les modes.** `RaceRules` (mode et nombre de tours) est lu à côté de la piste, pour qu'un panneau puisse raccourcir une course sans toucher au fichier. Track compte les tours, Rally en tient toujours un seul ; Collapse n'est pas écrit.

### 2.6 Structure des dossiers

Posée au squelette (2026-09-12), sur le modèle de hexact :

```
docs/                 les deux specs, le plan de construction, les croquis
poc/                  les POC, matière première, importés par rien
packages/<nom>/       un package = un module de 2.1 ; src/index.ts est sa seule surface
  src/entity/         modèle de données, sans three.js ni Jolt (tenu par dependency-cruiser)
  src/physics/        modèle physique, lit entity
  src/render/         modèle 3D, lit entity
apps/web/             l'application Angular : src/app/lab/ les vitrines, puis les zones du jeu
make/                 une cible par ligne, un fichier par domaine, inclus par le Makefile
angular.json          à la racine, parce que @angular/build veut le workspace comme racine
eslint.config.js, .dependency-cruiser.js, .jscpd.json, knip.json : les portes de qualité
```

Un package se consomme en source par alias `paths` (`@hexrace/<nom>` vers son barrel, `@<nom>/*` chez
lui), sans build de bibliothèque. Les tests d'un package tournent sous Vitest avec jsdom et le
compilateur JIT d'Angular chargé dans `test-setup.ts`, pour que les `@Injectable` s'exécutent.

---

## 3. Tuiles et pistes

- 3.1 Types du domaine
  _Tile, Profile, Face, Track, Environment : les types TypeScript qui portent [F 2.1] à [F 2.6], et leurs invariants._
- 3.2 Coordonnées et placement
  _Grille hexagonale côté plat vers l'avant, faces en heures d'horloge, comment une liste de tuiles devient des positions et des orientations dans le monde._

  **Écrit (2026-09-14, `packages/track`).** `TrackPlacement.place(piste, départ = ORIGIN)` pose les tuiles l'une après l'autre : chaque `PlacedTile` connaît sa case axiale, son orientation (rang horaire de la direction vers laquelle pointe sa face 12), son profil d'entrée et les deux pentes que ses voisines dictent ; `next` dit où irait une tuile de plus, ce qui sert à la fermeture et à l'éditeur. Aucune position n'est écrite dans les données. `Grid` (moves sur la grille) et `Layout` (case vers plan, en unités) restent dans `tile` : la piste ne fait qu'enchaîner. `overlaps`, `firstOverlap` et `validPrefix` disent où la piste se recoupe et ce qu'on peut encore en construire.
- 3.3 Format de fichier de piste
  _Grammaire exacte du fichier texte [F 5.4], versionnage de l'en-tête, parser et sérialiseur, messages d'erreur._

  **Grammaire, validée au POC 2 (2026-09-12).** Un fichier texte UTF-8, une instruction par ligne, `#` ouvre un commentaire jusqu'à la fin de la ligne, les lignes vides sont ignorées.

  ```
  hexrace-track 1

  id: europe-ring-01
  name: Petit Anneau
  environment: europe
  mode: track
  laps: 3

  [tiles]
  start  exit=12  pos=2  w=3  sh=1,1  h=40  t=1/1/1
         exit=2   pos=3  w=2  sh=1,0  h=48  t=2/1/1  obs=barrier:left,hazard:small@0.5/1
  ```

  - **Première ligne** : le nom du format et sa version, `hexrace-track 1`. Une autre version est refusée.
  - **En-tête** : des paires `clé: valeur`, dans n'importe quel ordre. `id`, `name`, `environment` (`north`, `europe`, `africa`) et `mode` (`track`, `rally`) sont obligatoires ; `laps` (entier) est propre au mode Track.
  - **`[tiles]`** ouvre la liste des tuiles, une par ligne dans l'ordre de parcours. L'entrée est toujours la face 6, seule la sortie s'écrit ; le profil d'entrée d'une tuile est le profil de sortie de la précédente, ce qui rend [F 2.6] vraie par construction. Le mot `start` peut ouvrir la première ligne, et seulement elle.
  - **Champs d'une tuile**, séparés par des blancs, sous la forme `clé=valeur` : `exit` face de sortie (12, 2, 4, 8, 10) ; `pos` et `w` position et largeur de la piste en sortie, en unités ; `sh` bas-côtés gauche,droite (0 ou 1 chacun, `0,0` si absent) ; `h` hauteur de sortie en pas de 20 cm ; `t` rangs piste/bas-côté/paysage dans la palette de l'environnement (1-3/1-3/1-2). Tous sont obligatoires sauf `sh` et `obs`.
  - **`obs`**, obstacles de la tuile séparés par des virgules, posés par rapport à la piste [F 2.4] : `hazard:<small|medium|large>@<fraction>[/<décalage>]`, `barrier:<left|right>[@<de>-<à>]` (toute la tuile si absent), `ramp@<de>-<à>`, `bump@<de>-<à>`, `patch:<rang de piste>@<de>-<à>[/<décalage>[x<largeur>]]`. Les fractions sont l'avancement sur l'axe de la tuile, de 0 à 1 ; le décalage est en unités depuis le centre de la piste, négatif à gauche.
  - **Erreurs** : le parser lit tout le fichier et remonte chaque problème avec son numéro de ligne (« ligne 8 : pos « deux » invalide, attendu un entier ») ; un fichier avec au moins une erreur ne donne aucune piste. La validité de la piste elle-même ([F 2.1], [F 2.6], [F 5.5]) est vérifiée ensuite, par la validation.
  - **Sérialiseur** : écrit une piste dans cette forme, colonnes alignées, valeurs par défaut omises ; relire ce qu'il écrit redonne la piste à l'identique.

  Référence : `poc/tile/src/model/trackFile.ts`.

  **Le modèle de tuile, écrit (2026-09-13, `packages/tile`).** Le POC 2 repris dans `entity/`, en unités, ses capacités en services (`TileSweeper`, `TileGeometry`, `TileObstacles`, `TileSurfaces`, `TileLines`, `TileTriangles`, `Environments`) et ses données en interfaces ; la piste n'y est pas : une tuile reçoit un `TileSweep` déjà résolu (centre, cap, profils d'entrée et de sortie, transition, pentes aux faces). `TileTriangles` rend les triangles en mètres (1 unité = 3 m, `toWorld` pose y sur la hauteur et z sur -nord), la même liste pour three.js (`render/`, `TileMeshes`, couleur par sommet, plat ou lissé) et pour Jolt (`physics/`, `TileBodies`, `MeshShape` statique), à une exception près : `TileBodies` laisse de côté les triangles peints `line`, le damier étant de la peinture sur la route et non un ralentisseur. Chaque triangle est enroulé normale vers le haut ou l'extérieur : Jolt ne collisionne qu'avec la face avant d'un maillage.

  **Le relief des obstacles (2026-09-15).** Les primitives d'enroulement sont un service, `TileFacets` (un point du plan porté dans le monde, un polygone en éventail, une paroi entre deux points, un triangle sans aire jeté) ; les bandes en relief en sont un autre, `TileBands`, qui donne son volume à la barrière (1 m de haut), à la rampe (montée linéaire jusqu'à 0,8 m puis paroi verticale arrière) et au dos d'âne (cosinus, 0,3 m au milieu, nul aux deux bouts), échantillonnés sur les mêmes tranches que l'emprise. Les hauteurs et les épaisseurs s'écrivent en mètres et passent par `Units.metersToUnits`, pour qu'un changement d'unité ne change pas la taille d'un obstacle. Chaque paroi est enroulée par rapport au **milieu de sa propre tranche**, jamais au centroïde du contour : sur une bande longue et courbe, le centroïde tombe du mauvais côté de certains segments et Jolt n'y voit que la face arrière.

- 3.4 Validation
  _Implémentation des règles [F 2.6] et [F 5.5] : jonctions, départ et arrivée, auto-intersection, fermeture en Track. Où elle s'exécute (éditeur, générateur, chargement)._

  **Écrit (2026-09-14).** `TrackValidation.validate(piste)` rend un `TrackReview` : le placement, la liste des `TrackIssue` et l'ensemble des tuiles à surligner. Un `TrackIssue` porte un code (`profile`, `obstacle`, `overlap`, `not-closed`, `slope`, `amplitude`, `hairpin-line`, plus les codes d'en-tête), la tuile en cause ou `null` pour l'en-tête, et un message en anglais (« slope of 25 % on a straight, at most 20 % »). Les jonctions ne se vérifient pas : un profil d'entrée **est** le profil de sortie de la précédente, [F 2.6] est vraie par construction. Les profils passent par `TileValidation` de `tile`, les obstacles aussi. Elle s'exécute au chargement d'un fichier, après chaque geste de l'éditeur et sur chaque piste générée.
- 3.5 Géométrie d'une tuile
  _Comment on construit le maillage d'une tuile depuis ses paramètres : piste, bas-côtés, paysage, transition au milieu, pente. Partage des sommets aux jonctions._
  _Réglé dans le POC 2 : la hauteur est une cubique de Hermite par tuile dont les pentes aux faces sont déduites des tuiles voisines (méthode de Steffen) ; les deux tuiles d'une jonction calculent la même pente, donc pas d'arête, et une tuile plate qui suit une pente reste plate._
- 3.6 Obstacles
  _Modèle de données (emprise en unités le long de la piste), modèle physique, modèle visuel, et comment l'environnement les habille [F 2.4]._
- 3.7 Environnements et surfaces
  _Comment une palette d'environnement associe un type de piste à des paramètres de friction et à un matériau de rendu [F 2.2]._
- 3.8 Générateur procédural
  _Graine et cadrans dans une chaîne, PRNG déterministe, génération tuile par tuile [F 5.3]. Ce qu'on reprend de la forge de hexact._

  **Écrit (2026-09-14).** Une chaîne dit tout : `europe:hexrace:t5s3r4v4o3:n30`, soit l'environnement, la graine, cinq cadrans de 0 à 9 (tournant, serré, relief, variété, obstacles) et le nombre de tuiles, au plus 500 (`GeneratorConfigs`). `Random.seeded(chaîne)` de `commons` en fait la suite, la même chaîne rend toujours la même piste. `TrackGenerator` ajoute une tuile après l'autre comme l'éditeur : `ExitChoices` tire la sortie parmi celles qui ne mènent pas sur une case occupée ni dans une case bouchée, `ProfileSteps` fait le profil de sortie (pas de largeur, de position et de types ; hauteur bornée aux trois quarts du seuil de la sortie, `GENERATOR_SLOPE_FACTOR`, qui suit la tendance en cours), `ObstacleSeeder` pose au plus un obstacle par tuile et l'écarte s'il déborde. La première tuile est une ligne droite, la dernière n'est jamais une épingle, les tuiles de départ et d'arrivée n'ont pas d'obstacle : la piste passe donc toujours la validation. Un retour arrière borné (500 essais par tuile) sort des spirales. Le générateur ne fait que des pistes ouvertes, c'est le mode Collapse.

  **Les boucles (2026-09-15).** `GeneratorConfig` porte un `mode` et la chaîne le note d'une lettre devant le nombre de tuiles, `n` pour une ligne en Rally et `l` pour un circuit en Track. Une boucle se ferme quand une tuile de plus après la dernière retombe sur le départ, même case et même cap ; le départ étant toujours l'origine cap nord, cela revient à poser la dernière tuile sur `CLOSING_CELL` (0,-1) et à en sortir vers le nord. `LoopClosing` tient les trois outils : la distance en cases, la marge qui reste au-delà du plus court chemin, et un parcours des cases libres qui dit si la maison est encore joignable — la distance seule ne voit pas un tracé qui s'est muré, ce qui est la façon dont une longue boucle échoue. Le générateur écarte donc à chaque tuile les sorties de marge négative, et, sous `TIGHT_SLACK` tuiles de marge, ne garde que celles d'où la maison reste joignable et les essaie de la plus serrée à la plus large. Côté profil, la dernière tuile d'une boucle reprend le profil de départ, ce qui rend le raccord exact, et `ProfileSteps` ramène la hauteur vers celle du départ en la bornant à ce que les tuiles restantes peuvent rattraper au seuil d'une épingle — y compris quand le cadran de relief décide de ne pas bouger, sans quoi la dernière tuile héritait d'une marche impossible. Le tout tourne sous un budget global (`loopBudget`), et une boucle qui ne ferme pas est rejouée en Rally, si bien que `generate` rend toujours une piste que la validation accepte.

  **Complété (2026-09-15).** `ObstacleSeeder` ne peut plus boucher la piste [F 2.4]. Pour un hazard, il tire la taille et la fraction `at`, lit la coupe à cette fraction par `TileSweeper.boundariesAt` (la largeur et les bas-côtés varient le long de la tuile, seule la valeur à `at` compte) et mesure l'emprise en travers par `TileObstacles.footprint`, plutôt que de relire les constantes de `tile`. De là deux intervalles de décalages : le hazard à gauche qui laisse `MIN_PASSAGE` = 1 unité de piste à sa droite, le hazard à droite qui en laisse autant à sa gauche, tous deux bornés par le bloc piste + bas-côtés. Le décalage se tire parmi les demi-unités de leur union, jamais par rejet, pour qu'une tuile que le cadran veut chargée le reste ; si l'union est vide, la taille descend d'un cran (`large` → `medium` → `small`) et, à défaut, le hazard devient une plaque. La règle est du côté du semeur : `TileValidation` continue de ne dire que le débordement hors de la tuile, l'éditeur restant libre de barrer la piste.
- 3.9 Fenêtre de tuiles
  _Chargement et déchargement des tuiles autour du joueur [F 9.2], et le front de disparition de Collapse [F 4.4] par-dessus._

  **Écrit (2026-09-14).** Le joueur est une **position continue** le long de la piste : partie entière l'index de la tuile, partie décimale l'avancement sur son axe. `TrackWindow.cursorAt` la découpe (en boucle elle repasse par le départ, en ligne elle s'arrête aux bouts), `indices` donne les tuiles vivantes (`ahead` devant, `behind` derrière, 4 et 2 par défaut) et `playerPose` rend le centre de la piste sous le joueur, sa direction de marche et la hauteur du sol. C'est l'appelant qui pose et retire : la vitrine crée un `GameObject` par tuile avec `TrackMeshes.tile` et `TrackBodies.create`, et le détruit quand la tuile quitte la fenêtre, ce qui libère maillage et corps Jolt d'un coup. Le front de disparition de Collapse viendra par-dessus, en avançant la borne arrière tout seul.

---

## 4. Véhicule et physique

### 4.1 Modèle du véhicule

Le **contrôleur véhicule de Jolt** (`WheeledVehicleController` sous `VehicleConstraint`), comme rally-game utilisait son `MotorcycleController`. Écrire une voiture à raycasts maison serait trop pour un petit jeu d'arcade : suspensions, friction et transfert de masse seraient à refaire.

Ce contrôleur fait lui-même **un lancer par roue** à chaque pas (rally-game utilisait `VehicleCollisionTesterCastCylinder`) : chaque roue connaît le corps qu'elle touche et le point de contact. On a donc le contact par roue sans l'écrire.

**Écrit (2026-09-14, `packages/car`).** `CarBodies` construit le corps depuis un `CarSpec` : une boîte de 1,6 × 0,6 × 3,8 m, 1300 kg, centre de masse descendu de 30 cm sous le centre de la boîte par une `OffsetCenterOfMassShapeSettings` (moteur et transmission bas, la voiture ne se retourne pas), quatre `WheelSettingsWV` accrochées au bas de la caisse, suspension courte et raide (0,05 à 0,25 m, 2,5 Hz, amortissement 0,7), deux barres anti-roulis, et un `WheeledVehicleController` dont le moteur, la boîte automatique et les différentiels viennent du spec ; la transmission (traction, propulsion, quatre roues) est la part de couple des deux différentiels, un essieu à zéro n'ayant pas de différentiel du tout. Ce qui est triché tient en quatre choses, toutes du POC 1 : le braquage dégressif avec la vitesse, le grain des revêtements (bosses virtuelles injectées dans la précharge de suspension, force latérale bruitée), la traînée par roue au contact, et le grip latéral arrière divisé au frein à main. `CarController` mène le tout à chaque pas fixe et remplit un `CarState` que le HUD, le son, les traces et les particules lisent sans jamais l'écrire.

### 4.2 Surfaces et friction

Grâce au contact par roue fourni par le contrôleur (4.1), **chaque roue connaît sa surface**. À partir du point de contact, on retrouve la tuile et, en coordonnées locales de la tuile, la zone (piste, bas-côté, paysage) et donc le type de surface ; c'est un calcul pur sur le modèle de données, sans découper le maillage physique par zone. Les paramètres de friction longitudinale et latérale de la roue sont mis à jour à chaque pas selon la surface trouvée.

**Écrit (2026-09-13).** `TileSurfaces.at(sweep, point, obstacles)` dans `packages/tile` : le point de l'axe le plus proche donne `s`, la distance signée au centre de la piste le long de la droite du conducteur dit piste, bas-côté ou paysage, et une plaque qui couvre le point remplace le type de piste ; null hors de l'hexagone, une autre tuile possède le point.

**Le tableau par revêtement vit dans `car` (2026-09-14).** `tile` ne connaît d'une surface qu'un rang et une couleur ; ce qu'un rang fait à un pneu est du domaine de la voiture. `SURFACE_CATALOG` (`car/entity/surfaces/`) range un `SurfaceFeel` par environnement, zone et rang : courbes de friction longitudinale et latérale, résistance au roulement, traînée, hauteur de bosse, rugosité latérale, longueur d'onde du grain, couleur et opacité de la trace, et les paramètres de son de glisse, de roulement et de particules. Les onze `SurfaceFeel` sont nommés par leur caractère (`firm`, `worn`, `rough`, `loose`, `soft`, `boggy`, `turf`, `packed`, `deep`, `slick`, `rocky`) et jamais par leur matière, comme [F 2.2] l'exige ; quatre d'entre eux sont exactement les revêtements réglés au POC 1, les autres sont un premier jet à doser en roulant. Les courbes sont du μ effectif : `WheelSurfaces` les élève au carré avant de les donner à Jolt, qui combine pneu et sol par la racine du produit et dont tous les sols ont une friction de 1.

Qui répond « quel revêtement sous ce point » n'est pas le problème de la voiture : le `CarController` reçoit un `SurfaceProbe`, l'appelant le remplit. La vitrine `lab/car` en donne un qui lit ses bandes peintes ; la course en donnera un bâti sur `TileSurfaces`. Le passage d'une zone à l'autre n'est pas lissé : la roue prend la nouvelle surface au pas où son contact y entre, et les quatre roues étant indépendantes, la voiture traverse une frontière essieu par essieu, ce qui suffit à la sentir sans à-coup.

### 4.3 Glisse, frein à main, tête-à-queue

**Écrit (2026-09-14).** Jolt tient la friction latérale sur le seul angle de dérive, si bien qu'une roue arrière bloquée garde presque tout son grip de côté et que la voiture ralentit au lieu de tourner. Le frein à main divise donc la courbe latérale arrière par le facteur `handBrakeLateralGrip` du modèle (0,3 au POC) tant qu'il est tiré, et la remet dès qu'il est lâché : c'est le « tire et lance » d'arcade de [F 3.5]. La marche arrière est celle de l'exemple Jolt : la pédale freine tant que la voiture avance à plus de 0,5 m/s, et engage la marche arrière une fois à l'arrêt ; en boîte manuelle elle ne fait que freiner, R étant un rapport. Les entrées passent par une courbe de réponse mêlant linéaire et cubique (0,6 en direction, 0,3 aux pédales), qui adoucit le centre sans rogner les extrêmes, et un freinage de repos de 0,2 empêche la voiture de descendre les pentes toute seule. L'aide invisible du tactile est l'amortissement de lacet : un couple opposé à la rotation autour de l'axe haut de la caisse, mis à l'échelle de l'inertie de lacet donc réglé en 1/s, appliqué seulement quand une roue touche, coupé à la manette où la glisse brute plaît mieux.

### 4.4 Suspensions

**Écrit (2026-09-14).** Course courte et raide : 0,05 à 0,25 m, ressort à 2,5 Hz, amortissement 0,7, deux barres anti-roulis à 1000, ce qui garde la caisse à plat sans effacer le travail des roues. Le grain d'un revêtement entre par la **précharge** de la suspension et non par une force : à 5 Hz, même une force du poids de la voiture ne déplace 1300 kg que de quelques millimètres, alors qu'une précharge fait travailler le ressort comme si le sol s'était levé ; le maillage de la roue est levé d'autant, si bien qu'elle roule visiblement sur un sol que le collider ne porte pas. `WheelContacts` relève la vitesse de détente de chaque roue et le talonnage, dont le son de châssis tire ses coups.

### 4.5 Sauts

**Écrit (2026-09-14).** Rien à écrire pour le vol : sans roue au sol, le contrôleur véhicule n'a plus de prise, et ni le grain, ni l'amortissement de lacet, ni la traînée de revêtement ne s'appliquent — le « pas de contrôle en vol » de [F 3.6] tombe tout seul. `CarState.airborne` dit qu'aucune roue ne touche. La détection de retournement et la remise sur les roues restent à faire avec le reset de la course ; au banc, le reset manuel suffit.

### 4.6 Collisions et dégâts

**En partie écrit (2026-09-14).** Le corps de la voiture est enregistré auprès de `JoltPhysics`, dont l'écouteur de contacts appelle `onCollisionEnter` ; `CarController` publie alors `car/collision` avec la vitesse et le nom de ce qui a été touché. Les **dégâts et les sons de collision sont explicitement remis à plus tard** (décision de Gérald, 2026-09-14) : le contrat d'affichage existe déjà dans le `hud` (`DamageReadout`, douze éléments en pourcentage), rien ne le produit encore.

### 4.7 Reset et respawn

**Écrit (2026-09-14).** `CarController` tient le bouton de reset : maintenu trois secondes ([F 3.8]), il repose la voiture à son point de départ (`home`, `homeHeading`), à l'arrêt, relit sa pose sur-le-champ pour que la caméra et le directeur ne voient pas une image de retard, et publie `car/reset` ; `CarState.resetHeld` nourrit la jauge du HUD.

Où est ce point de départ, c'est `game-commons` qui le dit, parce que lui seul sait où la piste passe. `RaceDirector` garde **la dernière tuile parcourue** — celle que `TrackLocator` a trouvée au dernier pas où la voiture était sur le terrain — et y déplace `home` à chaque changement de tuile, à la place libre la plus proche du centre (`SpawnSpots`, 2.5). Dès que `FallWatch` juge la voiture tombée, ou qu'un raccourci lui a fait sauter une tuile, il repose `home` de la même façon et déclenche le reset : la course continue, le chrono aussi, et `race/fall` ou `race/cut` est publié. Un reset manuel ramène donc au même endroit, puisque `home` y est déjà.

**Tombée, ça veut dire quoi.** Le monde n'a pas de sol : chaque tuile descend par une jupe jusqu'à un plancher commun à toute la piste [F 2.7]. `FallWatch` ne regarde qu'une hauteur : sous le plancher moins une marge (3 m par défaut, réglable), plus rien ne peut rattraper la voiture. Pas de volume de déclenchement, pas de test de sortie de polygone : une seule comparaison par pas.

`RaceDirector.restart()` repose la voiture de la même façon, mais sur la ligne de départ, à peine passée, pour que son premier franchissement compte comme un tour.

### 4.8 Déterminisme

<TODO> Ce qu'on garantit (même entrée, même course) et ce qu'on ne garantit pas. Conséquences pour le défi quotidien. Noté en passant : le grain est une fonction pure de la distance parcourue et du numéro de roue, donc rejouable ; les particules et les ratés d'allumage tirent de `Random.fresh()` et ne le sont pas, mais ne touchent ni la physique ni le chrono.

### 4.9 Réglage

**Écrit (2026-09-14).** Chaque module expose ses réglages au panneau `hud/debug`, qui les garde dans le stockage local et les rend en JSON à recopier dans le code. La vitrine `lab/car` en est le banc : masse et équilibre, moteur, boîte, direction, options de garage, revêtements, son, traces, particules, obstacles. Ce que Jolt ne lit qu'à la construction d'un corps — masse, centre de masse, courbe de couple, rapports — se réapplique en **reconstruisant la voiture au relâchement du curseur** (`onFinishChange`), pas à chaque pixel du glissement ; le reste (braquage, grip du frein à main, assistances, grain, revêtements, niveaux de son) est lu à chaque pas et change à chaud.

---

## 5. Entrées

Écrit avec le module `inputs` (2026-09-12). Référence : `packages/inputs/src`.

### 5.1 Abstraction des actions

`InputActions` est l'instantané que le jeu lit au début de chaque pas : `throttle`, `brake`
(0 à 1), `steer` (-1 à 1), `handBrake`, `reset` (0 à 1, le reset est maintenu et c'est la voiture
qui compte les trois secondes [F 3.8]), `gearUp` et `gearDown` (0 ou 1, boîte manuelle seulement),
et pour les menus `navigateX`, `navigateY` (-1 à 1, Y
positif vers le bas), `confirm`, `back`. Aucune notion de stick, de gâchette ni de touche n'y
figure : chaque source produit directement des actions selon le mapping de [F 3.3].

Une source implémente `InputSource` (`id`, `actions`, `connected`, `poll(dt)`) et se branche sur le
multi-provider `INPUT_SOURCES` ; `provideInputSources()` branche les trois du jeu, un test fournit
les siennes. Le service `Inputs` fusionne : maximum des grandeurs analogiques, somme bornée pour la
direction et la navigation (un clavier et une manette tenus ensemble ne se battent pas), et retient
`activeSource`, la dernière source engagée, pour le HUD et pour décider d'afficher les palonniers.

### 5.2 Manette

Gamepad API, disposition standard (Xbox). Gâchette droite `throttle`, gauche `brake` (zone morte
0,05), stick droit `steer` (zone morte 0,15, le stick gauche est accepté aussi, additionné et borné),
A `handBrake`, RB `gearUp`, LB `gearDown`, Y `reset` ; dans les menus A `confirm`, B `back`, stick
droit ou croix pour naviguer. A vaut frein à main en course et validation dans les menus : deux
contextes, jamais les deux à la fois. La première
manette branchée est écoutée ; si elle est débranchée, la suivante prend le relais. Pas de bouton de
pause : il n'y a pas de pause [F 4.1].

### 5.3 Clavier

WASD ou flèches pour `throttle`, `brake`, `steer` (et la navigation des menus), Espace `handBrake`, R
`reset`, E `gearUp`, Q `gearDown`, Entrée `confirm`, Échap `back`. Une touche vaut 0 ou 1 ; les trois actions de conduite
montent et descendent en rampe exponentielle (constante de temps 0,1 s, réglable) pour rendre au
numérique un peu de l'analogique. La perte de focus de la fenêtre relâche toutes les touches, faute
de voir leur relâchement. Les touches du jeu sont `preventDefault` pour que la page ne défile pas.

### 5.4 Tactile

Trois zones de l'écran : les 40 % de gauche sont le palonnier vertical (haut `throttle`, bas
`brake`), les 40 % de droite le palonnier horizontal (`steer`), et le bas de la bande centrale, sous
55 % de la hauteur, le bouton `handBrake`. Un palonnier est relatif : le point où le doigt se pose
est son zéro, la pleine action est à 50 px de là (réglable : plus court, plus sensible). Multi-touch par `pointerId`, un doigt
par zone. Les événements pris sont `preventDefault` et le `touch-action: none` de la page empêche
défilement et zoom. La source ne dessine rien : elle expose `paddles` (zone, origine, déflexion) et
un composant les dessine. Pas de changement de rapport au tactile : la boîte y est automatique. Les
menus se pilotent au toucher direct des boutons, rien à mapper.

Essayé sur téléphone le 2026-09-13 : zones et palonniers validés, course par défaut 50 px.

### 5.5 Navigation dans les menus

Les mêmes actions pour les trois périphériques : `navigateX/Y`, `confirm`, `back`. Les sources
livrent des valeurs continues ; c'est le module des menus qui détecte les fronts.

**Écrit (2026-09-15, `packages/hud/src/menus`).** `MenuNavigation` lit `Inputs` une fois par image,
dans sa propre boucle d'animation, et rend les gestes du pas : une zone morte à 0,5, un pas au
franchissement, puis une première attente de 0,4 s et une répétition toutes les 0,12 s tant que
l'axe est tenu, pour qu'un stick maintenu déroule une liste sans s'emballer ; `confirm` et `back`
ne se répètent pas. Une action déjà hors du repos quand la veille commence ne donne rien tant
qu'elle n'y est pas revenue : c'est ce qui empêche l'appui qui a ouvert un écran d'être relu par
l'écran qu'il ouvre. Chaque menu déclare le service dans ses `providers`, donc chacun a son propre
état de répétition.

---

## 6. Rendu

- 6.1 Scène et caméra
  _Organisation de la scène, caméra du dessus dont la hauteur suit la vitesse [F 3.9], lumière d'ambiance [F 8.4]._

  **La caméra, écrite (2026-09-13, `packages/camera`).** Elle lit une `CameraTarget` (position, cap, vitesse, tuile suivante) et se place derrière, à `distance`, sur un cap mêlé entre celui de la cible et la direction de la tuile suivante par le facteur `anticipation`, plafonné en degrés ; sa hauteur interpole `heightAtRest` et `heightAtSpeed` selon la vitesse ; elle vise `lookAhead` mètres devant. Position et visée sont lissées exponentiellement (`smoothing`), avec un `snap` pour les téléportations. Le calcul est pur (`solveRig`, dans `entity/`), le composant `FollowCamera` ne fait que l'appliquer au `CameraComponent` de l'engine. La voiture et la piste fourniront la cible ; en attendant, la vitrine `lab/camera` la fabrique.

  **Rien à changer au 2026-09-15.** Le à-coup de visée au passage d'une tuile venait de la cible, pas du rig : `CameraTarget.nextTile` sautait d'une tuile entière. Le directeur la fait désormais glisser (2.5), et le lissage exponentiel de `FollowCamera` absorbe le reste ; `RigSolver` est continu par construction, un test le fixe.

- 6.2 Style
  _Flat shading ou textures pixelisées, post-traitement [F 8.1], résolution de rendu réduite sur mobile._
- 6.3 Matériaux et lisibilité
  _Un matériau par type de surface et par environnement [F 8.2], comment on les fabrique et les nomme._
- 6.4 Effets
  _Particules, traces de pneus, déformation de la voiture [F 8.3] : technique de chacun et coût._
- 6.5 Modèles 3D
  _Voitures et obstacles : format, pipeline depuis Blender, conventions de nommage et d'échelle (une unité = une largeur de voie, 3 m)._
- 6.6 Budget de performance
  _Polygones, appels de rendu, textures, mémoire ; comment on mesure sur mobile et ce qu'on coupe en premier [F 9.2]._

---

## 7. Audio

### 7.1 Bibliothèque

Rien n'existe dans rally-game : Howler et Tone y sont installés, aucun son n'a été écrit.

**Tranché (2026-09-14) : Web Audio nu, aucune bibliothèque, aucun échantillon.** Tout le son du jeu est procédural, comme le POC 1 l'a validé : trois `AudioWorklet` écrits à la main, chargés depuis leur texte source par une Blob URL, donc sans fichier à livrer ni pipeline d'assets. Un seul service touche Web Audio, `AudioHub` dans `packages/car/audio` : il crée le contexte, charge un worklet une fois par nom, monte la chaîne d'une voix (nœud, gain, passe-bas éventuel) et la coupe. Tout le reste ne connaît que `Voice`, ce qui rend le son testable sans navigateur, et une page sans `AudioContext` roule en silence sans une seule erreur.

### 7.2 Moteur

**Écrit (2026-09-14).** Une impulsion de pression par cylindre sur le cycle du vilebrequin, cosinus surélevé plus bouffée de bruit, avec un décalage et un gain propres à chaque cylindre et une gigue par allumage : le train est irrégulier comme un vrai moteur. Il fait ensuite sonner trois résonances d'échappement et un filtre en peigne pour la longueur de pipe, prend un souffle d'admission sous charge et sature doucement. Un rupteur hache l'allumage au plafond de régime et pendant un passage plein gaz ; le pot détone au rétrogradage pied levé et crépite au hasard en décélération haut dans les tours. Un passe-bas final s'ouvre avec le régime et la charge, un moteur qui roule sur l'erre étant plus sourd qu'un moteur qui tire.

### 7.3 Roulement, glisse, collisions, interface

**Écrit (2026-09-14) sauf les collisions et l'interface.** Le crissement suit exactement les traces au sol : mêmes seuils, un pneu chante quand, et seulement quand, il écrit par terre. Une voix par rang de la palette, mêlant par le paramètre `tone` un sifflement tonal (bruit blanc dans une résonance aiguë qui monte avec la glisse) et un crissement granuleux (train de grains sous un passe-bas) ; les roues d'un même revêtement s'additionnent comme des bruits indépendants. Le châssis porte le reste : le roulement, une voix par rang dosée par le nombre de roues au sol et la vitesse ; le vent, bruit filtré qui s'ouvre et enfle avec la vitesse ; et les suspensions, un coup sourd à chaque compression rapide, un claquement plus léger à la détente, un choc métallique au talonnage, chaque roue muette un dixième de seconde après le sien. Les sons de collision et les retours d'interface restent à faire.

### 7.4 Contraintes navigateur

**Écrit (2026-09-14).** Le contexte naît au premier `keydown` ou `pointerdown` de la page, jamais avant : tous les navigateurs l'exigent et **la manette ne compte pas comme un geste**, d'où le bouton « Start sound » du banc. Qui veut le contexte s'inscrit auprès d'`AudioHub` et est rappelé quand il existe ; un contexte suspendu est repris au geste suivant. En arrière-plan le navigateur arrête les images, donc les niveaux cessent d'être poussés, mais le worklet continue de tourner : la reprise est immédiate au retour. Reste à mesurer sur mobile.

---

## 8. Écrans et interface

**Bibliothèque de composants : Angular Material, et les icônes Material Symbols** (décidé le
2026-09-13). Tout ce qui est générique dans l'inventaire de [F 7.5] est pris tel quel ; le package
`hud` n'écrit que les composants propres au jeu, répartis dans ses sous-modules : `commons` (conteneur
de canvas, barres, cartes, solde), `game` (compte-tours, rapport, vitesse, dégâts, chrono, compte à
rebours, aperçu, jauge de reset, faux sens, témoins, palonniers), `menus` (la détection des fronts
`MenuNavigation`, la liste `MenuList` et la grille `MenuGrid` ; écrit le 2026-09-15), `dialog`
(résultats), `editor`, `debug` (l'enveloppe Angular de lil-gui avec les ajouts du POC, et le
compteur de performance ; voir la décision du 2026-09-13).

- 8.1 Structure applicative (écrite le 2026-09-15, référence `apps/web/src/app`)
  **Trois zones, trois dossiers.** `game/` est le jeu, `lab/` les vitrines, `scene/` ce que les deux partagent. La règle qui les tient est dans `.dependency-cruiser.js` : `game/` et `scene/` ne lisent jamais `lab/`. Le lab est le banc d'essai d'un module, pas une bibliothèque du jeu ; ce qui sert aux deux déménage dans `scene/` au lieu d'être importé depuis le lab.

  **Le routage.** `app.routes.ts` ne fait qu'assembler : `LAB_ROUTES` d'abord, `GAME_ROUTES` ensuite, puis un `**` qui ramène à la racine. La racine est le jeu ; `/lab` reste atteignable telle quelle. Les écrans du MVP [F 7.1] sont `''` (l'accueil), `/tracks` (le choix de piste) et `/race/:track` (la course). Tout écran qui ouvre une scène 3D se charge en `loadComponent`, three.js et Jolt avec lui : un joueur qui reste dans les menus ne télécharge ni l'un ni l'autre.

  **Le canvas.** Il n'y en a qu'un pour toute l'application, celui de `ThreeRenderer`, service racine. Un écran ne le crée pas : il le donne à un `CanvasFrame` [F 7.5] qui l'adopte comme unique enfant et publie sa taille ; le renderer se redimensionne sur ce que la vue lui laisse. Passer d'un écran à l'autre déplace le même canvas, sans perdre le contexte WebGL ni recharger le wasm de Jolt, qui est chargé une fois par `JoltPhysics.load()`.

  **Le cycle de vie d'une scène.** `ScenePage` est la plomberie neutre : renderer et canvas, `load()` qui attend le wasm puis construit, la boucle à pas fixe (mise à jour de la scène, pas physique, image), et `leave()` qui arrête la boucle et détruit la scène quand la vue est quittée. Elle n'allume rien : ni panneau de debug, ni compteur de performance. `PhysicsLab` en hérite et ajoute ce qui n'appartient qu'au développeur — compteur allumé, panneau ouvert, caisses à lâcher. C'est une classe de plus plutôt qu'un drapeau, pour que le jeu ne tienne aucune référence aux outils du lab. `DrivingPage` en hérite aussi et porte ce que les deux pages de course partagent : la caméra de suivi, la scène que `RaceScene` assemble, le `CarDash` et le `RaceReadout` que le HUD lit à chaque image, et l'abonnement au drapeau ; une sous-classe pose sa piste dans `ready()` et répond à `finished()`.

  **Le dossier partagé.** `scene/` contient `ScenePage`, `DrivingPage`, `CarScene` (l'assemblage de la voiture), `RaceScene` (l'assemblage d'une course), `InputPoller`, `CarDash`, `CarGauges`, `RaceReadout` et `RaceHud`. Rien d'un environnement de test n'y entre : le sol peint en voies, les obstacles du POC 1 et le panneau de réglages restent dans `lab/`.
- 8.2 HUD
  _En DOM par-dessus le canvas ou dans la scène ; fréquence de rafraîchissement ; l'indicateur du front de disparition [F 7.2]. Ce qui bouge à chaque image se met à jour hors de la détection de changement, par signaux ou écriture directe du DOM depuis la boucle._
- 8.6 Panneau de debug (écrit le 2026-09-13, référence `packages/hud/src/debug`)
  lil-gui derrière le service `DebugPanel` : un module appelle `register(titre, build, destroyRef)` et construit son dossier dans `build` ; le service restaure les valeurs du dossier depuis `localStorage` (clé `hexrace.debug.<titre>`, sans les relevés ni les boutons), les sauve à chaque `onFinishChange`, ajoute un bouton de reset et détruit le dossier avec son propriétaire. La racine porte le dossier Performance (`PerfMeter`, alimenté par la boucle ; le moteur y écrira la durée du pas), l'export JSON des valeurs (courantes contre initiales, via `controller.initialValue`) et le reset général. Deux rangées maison : `addCurveEditor` (le POC voiture) et `addPlot` (tracé glissant). Bascule par la touche `\``. Le panneau est créé à la demande : un jeu livré qui ne l'appelle pas ne le charge pas.
L'indicateur de performance en coin d'écran est le composant `PerfCorner`, monté dans l'application et affiché quand `PerfMeter.cornerVisible` est vrai.
- 8.7 Composants du HUD (écrit le 2026-09-13, référence `packages/hud/src/game`, `commons`, `dialog`)
  Chaque composant est `OnPush` et une fonction de ses entrées `input()`, sans dépendance vers `car`, `track` ou `game` : ce sont eux qui le nourriront. Les contrats d'affichage vivent dans le `hud` : `DamageReadout` (douze éléments, 100 intact à 0 cassé), `TimerReadout` (mode, temps courant, tour, meilleur, écart, temps de passage), `AssistReadout`, `TrackSummary`, `CarSummary`, `RaceResult`. Ce qui se rejoue (flash du rapport, pulsation du dégât, chute du compte à rebours) est une Web Animation lancée depuis un `effect`, pas une recréation d'élément. Le conteneur de canvas adopte le canvas qu'on lui donne et publie sa taille par `ResizeObserver` ; le renderer s'y ajustera. La boîte de résultats est un `MatDialog` ouvert par le service `ResultsDialogs`, qui rend `'retry'` ou `'home'`. Thème : `mat.theme` sombre dans `apps/web/src/styles.scss` ; icônes `material-symbols` servies en local et déclarées police par défaut de `MatIconRegistry` au démarrage.
  Les couleurs sont des variables CSS globales posées dans `apps/web/src/styles.scss` (`--hr-accent`, `--hr-danger`, `--hr-ok`, `--hr-text`, `--hr-surface`, `--hr-track`, `--hr-card`, `--hr-glass`…) ; chaque composant les lit avec un repli sur la même valeur, pour rester correct hors de l'application.
  Le `hud` se teste par le builder Angular (`ng test hud`, projet `hud` de `angular.json` pointant sur le build de l'application) : le JIT brut de Vitest ne voit pas les entrées par signal.
- 8.3 Éditeur
  _Architecture de l'éditeur [F 5.2], réutilisation du rendu de piste, interactions clavier et souris, sauvegarde._
- 8.4 Garage
  _Données des voitures et améliorations [F 3.1], comment elles sont décrites et chargées._
- 8.5 Textes
  _Anglais uniquement [F 9.4], mais un seul endroit pour toutes les chaînes._

---

## 9. Persistance

### 9.1 Stockage local

Schéma des données sauvegardées [F 6.4] dans le stockage local du navigateur, avec un numéro de version dans la clé ou le document.

**Aucune migration** à écrire tant que le jeu n'est pas déployé sur `hexrace.delper.software` : avant cela, un changement de schéma efface simplement les données locales.

**Écrit (2026-09-14, `BestTimes` dans `packages/game-commons`).** Les meilleurs temps vivent sous la clé **`hexrace.best.v1`**, le numéro de version étant dans la clé. Le document est un seul objet JSON :

```json
{ "tracks": { "europe-ring-01": 61234, "north-catalog-01": 128900 } }
```

`tracks` associe l'identifiant d'une piste au meilleur temps total en millisecondes [F 6.1] ; rien d'autre n'est gardé, ni date, ni voiture, ni détail par tour (la spec 4.2 refuse le chrono au tour). Un document absent, illisible ou de la mauvaise forme est traité comme vide, pas migré ni réparé. Sans `window` — sous un rendu nu ou un test — rien n'est écrit et chaque course se lit comme un record, ce qui garde la classe utilisable partout.

Le panneau de debug garde ses propres réglages sous ses propres clés ; les pistes éditées (9.2) et les réglages du joueur (7.3) n'ont pas encore de schéma.

- 9.2 Pistes éditées
  _Stockage des fichiers de piste dans le navigateur, listing, suppression._
- 9.3 Évolution vers un serveur
  _Ce qu'il faudra pour une sauvegarde distante et le défi quotidien ; ce qu'on prépare aujourd'hui sans le construire._

---

## 10. Qualité et tests

- 10.1 Tests unitaires
  _Sur les services sans DOM, three.js ni Jolt : parser, validation, placement, générateur, machine à états. Vitest avec TestBed, couverture visée._
- 10.2 Tests de conduite
  _Scénarios physiques reproductibles (une épingle au frein à main, un saut) qui vérifient le ressenti sans humain._
- 10.3 Tests de bout en bout
  _Ce qu'on vérifie dans un vrai navigateur, sur quels écrans._
- 10.4 Portes de qualité
  _Lint, dépendances, duplication, code mort, couverture : ce qu'on reprend de hexact et à quel seuil._
- 10.5 Commandes
  _Le Makefile : une cible par geste, la liste tient sur un écran._
- 10.6 Outils de debug
  _Le sous-module `debug` du HUD : compteur d'images, panneau de réglage, affichage des formes physiques, téléportation, rejouer une graine._

---

## 11. Build et déploiement

- 11.1 Build de production
  _Taille du bundle, découpage, chargement des assets et du wasm, cache._
- 11.2 Hébergement
  _Site statique sur `hexrace.delper.software` ; Cloudflare comme hexact._
- 11.3 Hors ligne
  _Application installable, service worker, ce qui est mis en cache [F 9.3]._
- 11.4 Mobile
  _Navigateur d'abord ; ce qu'un portage en application demanderait plus tard [F 1.4]._
- 11.5 Compatibilité
  _Navigateurs et versions supportés, détection des prérequis (WebGL2, wasm), message quand ils manquent._

---

## 12. Plan des POC

- 12.1 POC 1 : voiture et surfaces
  _Ce qu'on construit techniquement pour [F 10.1], dans quel ordre, et ce qui est jetable._
- 12.2 POC 2 : tuiles et pistes
  _Idem pour [F 10.2] : types, placement, géométrie, parser, validation, générateur, fenêtre de tuiles. Terrain seul, sans Jolt. La carte 2D du POC (canvas, balayage des zones et des obstacles) est candidate à passer telle quelle dans `hud` pour l'aperçu des tuiles suivantes [F 7.2]._
- 12.3 POC 3 : la voiture sur les tuiles
  _Idem pour [F 10.3] : surface par roue depuis les coordonnées locales de la tuile, collider de tuile, fenêtre de tuiles en mouvement._
- 12.4 Du POC au MVP
  _Ce qui passe tel quel, ce qui est réécrit, ce qui est jeté._
  **Décidé le 2026-09-12 : on ne fait pas le POC 3 à part, on commence le jeu.** La construction se
  fait module par module, du plus bas niveau au jeu fini, chaque module jouable seul dans une
  « vitrine » sous la route `lab/<module>` de l'application ; le POC 3 devient la vitrine du tronc
  commun de jeu. Le détail, l'ordre et les fiches par module sont dans le
  [plan de construction](plan-de-construction.md).

---

## 13. Décisions et questions ouvertes

### 13.1 Registre des décisions

| Date       | Décision                                                                                                                                                                                                                                                                                                                                                         | Raison                                                                                                                                                                                                        |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-10 | three.js avec WebGLRenderer, WebGL2                                                                                                                                                                                                                                                                                                                              | Partout, intégration Jolt déjà écrite, WebGPU sans gain pour du low poly                                                                                                                                      |
| 2026-09-10 | Jolt Physics, contrôleur véhicule à roues                                                                                                                                                                                                                                                                                                                        | Éprouvé (Godot 4.4), contact par roue fourni, repris de rally-game                                                                                                                                            |
| 2026-09-10 | Angular partout : services `providedIn: 'root'` dans tous les packages, composants dans le seul `hud`                                                                                                                                                                                                                                                            | Tant qu'on a Angular, on l'utilise jusqu'au bout                                                                                                                                                              |
| 2026-09-10 | Toolchain et chaîne qualité de hexact                                                                                                                                                                                                                                                                                                                            | Déjà rodées                                                                                                                                                                                                   |
| 2026-09-10 | Le mot est « tile », jamais « hex »                                                                                                                                                                                                                                                                                                                              | En anglais, _hex_ est aussi une malédiction                                                                                                                                                                   |
| 2026-09-10 | Sous-modules `entity` / `physics` / `render` dans `tile` et `car`                                                                                                                                                                                                                                                                                                | Comme hexact ; le modèle se teste sans Jolt ni three.js                                                                                                                                                       |
| 2026-09-10 | Injection de dépendances Angular partout, jetons pour les interfaces, injecteur enfant par scène                                                                                                                                                                                                                                                                 | Le code de rally-game sans DI ne plaisait pas ; testabilité                                                                                                                                                   |
| 2026-09-10 | Scènes à la Unity / Godot sur le GameObject / GameComponent de rally-game                                                                                                                                                                                                                                                                                        | Assembler les composants d'un écran                                                                                                                                                                           |
| 2026-09-10 | EventBus pour le transverse                                                                                                                                                                                                                                                                                                                                      | Éviter les dépendances croisées                                                                                                                                                                               |
| 2026-09-10 | ~~Debug via le HUD Angular, pas lil-gui~~ (annulée le 2026-09-13)                                                                                                                                                                                                                                                                                                | Un seul outillage d'interface                                                                                                                                                                                 |
| 2026-09-10 | Perte de focus : pas de pause, temps écoulé appliqué au retour                                                                                                                                                                                                                                                                                                   | Cohérent avec [F 4.1]                                                                                                                                                                                         |
| 2026-09-10 | Pas de migration de stockage avant le déploiement                                                                                                                                                                                                                                                                                                                | Rien à préserver avant                                                                                                                                                                                        |
| 2026-09-12 | Grammaire du fichier de piste : celle du POC 2 (3.3)                                                                                                                                                                                                                                                                                                             | Lisible à la main, une ligne par tuile, obstacles en clair, relecture à l'identique                                                                                                                           |
| 2026-09-12 | Pas de POC 3 séparé : le jeu se construit module par module, chaque module jouable seul dans une vitrine `lab/<module>` (12.4, [plan](plan-de-construction.md))                                                                                                                                                                                                  | Un banc de réglage durable par module ; l'assemblage des vitrines est le jeu                                                                                                                                  |
| 2026-09-12 | Pas de constructeur à paramètres : `inject()` partout, tests par `TestBed` avec des jetons remplacés                                                                                                                                                                                                                                                             | Ne pas se casser la tête à monter des graphes d'objets à la main dans les tests                                                                                                                               |
| 2026-09-12 | Règles ESLint maison de hexact non reprises telles quelles ; couverture à 100 % pour `entity` seulement, seuil par package pour `physics` et `render`                                                                                                                                                                                                            | La DI partout et la 3D changent ce qui se teste honnêtement sans navigateur                                                                                                                                   |
| 2026-09-12 | Deux packages de plus que 2.1 : `commons` (vocabulaire, EventBus, RNG) et `engine` (boucle, scènes, GameObject, services three et Jolt)                                                                                                                                                                                                                          | La spec les sous-entendait sans les nommer                                                                                                                                                                    |
| 2026-09-13 | Une scène = un injecteur enfant Angular ; les composants de jeu sont construits dedans (`Scene.instantiate`) et obtiennent leurs dépendances par `inject()`, leurs données par champs publics                                                                                                                                                                    | Pas de constructeur à paramètres, ménage des corps et maillages avec la scène (2.2)                                                                                                                           |
| 2026-09-13 | La caméra suit un cap mêlé entre la voiture et la tuile suivante par un facteur réglable et plafonné, plutôt qu'une visée séparée                                                                                                                                                                                                                                | Un seul réglage à sentir, la voiture reste centrée quand le facteur est nul (3.9)                                                                                                                             |
| 2026-09-13 | Le modèle de tuile compte en unités, le monde 3D en mètres ; la conversion se fait en sortie de `tileTriangles`, une seule liste de triangles pour le maillage et le collider                                                                                                                                                                                    | Le POC 2 reste vrai mot pour mot, three et Jolt reçoivent des mètres, et le collider ne peut pas diverger du visuel (3.5)                                                                                     |
| 2026-09-14 | Plus une fonction au niveau du module dans les packages, hors fabriques `provide*` : l'arithmétique est un service (`Maths`, `Polygons`), l'aléa une fabrique (`RngFactory`), les aides de lil-gui des services du `hud`, la mise en forme du temps une pipe ; les doublures de test vivent dans des `*.mock.ts` ; le composant de jeu s'appelle `GameComponent` | La deuxième passe de remise d'aplomb, sur vingt remarques de relecture ([plan](remise-d-aplomb-2.md))                                                                                                         |
| 2026-09-14 | `entity/` est de la donnée pure dans tous les packages ; la logique en unités de `tile` vit dans `geometry/`, en services par capacité, un fichier par service ; `Vec2` et `Vec3` sont des objets-valeurs immuables de `commons/math`, seule exception à la règle sans constructeur                                                                              | Le premier port du POC 2 mêlait donnée, fonctions et services dans `entity/` ; deux règles de lint et deux règles dependency-cruiser tiennent désormais la forme ([remise d'aplomb](remise-d-aplomb-tile.md)) |
| 2026-09-13 | Pas d'interface ni de jeton devant three.js et Jolt : `ThreeRenderer` et `JoltPhysics` sont injectés par leur nom                                                                                                                                                                                                                                                | Une interface `Physics` qui expose `Jolt`, `bodyInterface` et des `Body` n'abstrait rien ; Jolt n'est pas remplaçable (contrainte véhicule, formes, raycasts) et le vrai tourne sous Vitest (2.2)             |
| 2026-09-13 | Jolt par `jolt-physics.wasm-compat` (wasm en base64 dans le JS), chargé paresseusement avec la route qui en a besoin                                                                                                                                                                                                                                             | Se charge aussi sous Vitest, donc les tests de physique tournent sur le vrai Jolt ; le `.wasm` séparé reste l'option si le démarrage mobile pèse                                                              |
| 2026-09-12 | Code, commentaires et tests en anglais ; docs et commits en français ; règle `comment-ration` de hexact reprise                                                                                                                                                                                                                                                  | Demande de Gérald ; un commentaire rationné par ce qu'il documente                                                                                                                                            |
| 2026-09-13 | Angular Material pour les composants génériques, Material Symbols pour les icônes ; `hud` n'écrit que le propre au jeu ([F 7.5])                                                                                                                                                                                                                                 | On ne refait pas un menu ni une boîte de dialogue                                                                                                                                                             |
| 2026-09-13 | Panneau de debug : lil-gui repris avec les ajouts du POC voiture, dans `hud/debug` ; annule la décision du 2026-09-10                                                                                                                                                                                                                                            | Jamais visible du joueur, pas la peine de le redévelopper en Angular                                                                                                                                          |
| 2026-09-14 | Les pistes d'exemple sont gardées comme **textes de fichier `.track`** dans `entity/examples/`, pas comme objets `Track`                                                                                                                                                                                            | Une seule source pour la donnée et pour le format ; réécrire ce qu'on a lu redonne le fichier octet pour octet, ce qui teste la grammaire 3.3 à chaque suite                                          |
| 2026-09-13 | Dégâts : un pourcentage par élément (100 intact, 0 cassé), effets proportionnels ([F 3.7, F 7.5])                                                                                                                                                                                                                                                                |
| 2026-09-14 | Le tableau par revêtement (adhérences, traînée, grain, traces, sons, particules) vit dans `car`, pas dans `tile`, sous la clé environnement + zone + rang ; ses entrées portent un nom de caractère, jamais de matière                                                                                                                                        |
| 2026-09-14 | Audio : Web Audio nu, aucune bibliothèque et aucun échantillon ; trois AudioWorklet procéduraux du POC 1, chargés depuis leur texte par Blob URL, derrière un `AudioHub` seul à toucher Web Audio                                                                                                                                                            |
| 2026-09-14 | `render/` et `audio/` de `car` lisent la physique par une interface de donnée (`CarReadout`), jamais le contrôleur                                                                                                                                                                                                                                          |
| 2026-09-14 | Un réglage que Jolt ne lit qu'à la construction d'un corps reconstruit la voiture au relâchement du curseur, pas à chaque pixel                                                                                                                                                                                                                              |
| 2026-09-14 | Dégâts et sons de collision remis à plus tard : la collision ne publie qu'un événement                                                                                                                                                                                                                                                                       | Plus fin que trois états, et directement lisible                                                                                                                                                              |
| 2026-09-14 | Le chrono et le compte à rebours tournent sur l'horloge réelle (`Clock` dans `commons`, `Date.now()` derrière un jeton), pas sur les pas fixes                                                                                                                                                                                                             | Conséquence de 2.4 : pas de pause, le temps d'un onglet caché est appliqué et non simulé ; `commons` ne compile pas le DOM, donc pas de `performance`                                                          |
| 2026-09-14 | La place de la voiture sur la piste est **un seul nombre continu**, partie entière la tuile et fraction l'avancement dessus                                                                                                                                                                                                                                | La fenêtre de tuiles, le tour, le sens interdit et la remise en place se lisent tous du même relevé ; c'est déjà ce que `TrackWindow` demande                                                                  |
| 2026-09-14 | Un franchissement de ligne se mesure par le plus court chemin sur la boucle ; un aller-retour ne compte aucun tour, une marche arrière retire le tour donné                                                                                                                                                                                                | Sur une boucle la position saute de n - ε à 0 + ε ; une simple différence compterait un tour à chaque tour de piste à l'envers                                                                                 |
| 2026-09-14 | La voiture part sur la ligne de départ, à peine passée, et la chute est jugée sous le plancher de la jupe moins une marge, avec remise au centre de la dernière tuile parcourue                                                                                                                                                                            | Le premier passage sur la ligne compte alors comme un tour ; et une seule comparaison de hauteur par pas suffit, sans volume de déclenchement ([F 2.7], [F 3.8])                                               |
| 2026-09-14 | Meilleurs temps dans le stockage local sous `hexrace.best.v1` : le temps total par piste, rien d'autre ; le HUD reçoit tour n sur N, sans meilleur tour ni écart                                                                                                                                                                                           | [F 6.1] et [F 4.2] : le score est le chrono total, il n'y a pas de chrono au tour ni de fantôme                                                                                                                |
| 2026-09-15 | `ObstacleSeeder` tire le décalage d'un hazard dans l'intervalle admissible plutôt que de tirer puis rejeter, et descend d'une taille, puis pose une plaque, quand l'intervalle est vide                                                                                                                                                                    | Rejeter viderait d'obstacles les tuiles étroites que le cadran veut chargées ; la règle du passage reste chez le semeur, `TileValidation` ne dit que le débordement                                            |
| 2026-09-15 | La largeur d'un hazard se mesure par `TileObstacles.footprint` à décalage nul, pas en relisant les constantes de `tile`                                                                                                                                                                                                                                    | Le semeur suit la géométrie réelle sans importer un fichier de `tile` hors de son barrel, ce que dependency-cruiser refuse de toute façon                                                                      |
| 2026-09-15 | 1 unité = **2,5 m** et non 1,7 m : `UNIT_METERS` dans `tile/entity/units.ts`, tout le reste suit par `Units`                                                                                                                                                                                | Une largeur de voie, pas une largeur de voiture (la caisse fait 1,6 m) ; seules les constantes en mètres et les tests qui les citaient ont bougé ([F 2.1])                                    |
| 2026-09-15 | Les hauteurs et épaisseurs d'obstacles sont écrites **en mètres** et converties par `Units.metersToUnits` : hazard 1,5 m, barrière 1 m et corps de 0,4 m, rampe 0,8 m, dos d'âne 0,3 m, relevé d'une face plate 0,03 m                                                                    | Écrites en unités, elles suivaient l'unité : à 2,5 m un hazard aurait fait 2,5 m de haut et une barrière 2 m                                                                                  |
| 2026-09-15 | `TileBodies` ignore les triangles dont la peinture est `line`                                                                                                                                                                                                                                | Le damier était dans le collider, relevé de 10 cm : un ralentisseur en travers de la piste de départ ([F 2.5])                                                                               |
| 2026-09-15 | La rampe et le dos d'âne ont une géométrie, dans le maillage **et** le collider, sortie dans un service `TileBands` avec les primitives d'enroulement dans `TileFacets`                                                                                                                  | Dessinés comme une plaque relevée, ils étaient invisibles et sans effet ; `TileTriangles` reste lisible ([F 2.4])                                                                            |
| 2026-09-15 | Les parois d'une bande sont orientées par rapport au milieu de leur tranche, pas au centroïde du contour                                                                                                                                                                                     | Sur une barrière tout le long d'un virage, le centroïde global retournait la normale de certains segments : Jolt voyait la face arrière et la voiture passait au travers                     |
| 2026-09-15 | `UNIT_METERS` passe de 2,5 à **3** ; rien d'autre ne bouge dans le code, seuls les tests qui citaient les pas de pente suivent                                                                                                                                                              | Retour de conduite du 2026-09-15 : la piste restait trop étroite pour la glisse en virage ([F 2.1])                                                                                          |
| 2026-09-15 | `GENERATOR_SLOPE_FACTOR` passe de 0,5 à **0,75**                                                                                                                                                                                                                                              | Les pistes générées étaient trop plates une fois les tuiles allongées à 3 m d'unité ([F 2.3])                                                                                                |
| 2026-09-15 | `make serve-lan` sert en **https** (`--ssl`) ; `AudioHub.supported` dit si le son peut jouer                                                                                                                                                                                                  | `AudioWorklet` n'existe qu'en contexte sécurisé : en http sur une adresse LAN le jeu était muet sans un mot ; le téléphone accepte le certificat une fois                                          |
| 2026-09-15 | Toutes les adhérences du tableau par revêtement montent de **20 %**, les deux courbes et les onze rangs, l'ordre des rangs inchangé                                                                                                                                              | La voiture partait en glisse dans la plupart des virages ; le caractère relatif de chaque revêtement est conservé ([F 2.2])                                                                  |
| 2026-09-15 | `MAX_SLOPE` porté à 0,25 / 0,18 / 0,12 ; `ProfileSteps.height` tire la hauteur sur `rng.chance(relief)` puis sur une part de `limit * relief` bornée par `RELIEF_FLOOR` = 0,5, au lieu d'un `chance(relief * 0,55)` suivi d'un entier uniforme depuis 1                                                     | Curseur de relief au maximum, 46 % des tuiles restaient plates et la marche moyenne faisait 1,4 m sur 41,6 m ; mesuré à 3 % de tuiles plates et 4,3 m après ([F 2.3], [F 5.3])                |
| 2026-09-15 | Le corps d'une barrière occupe les 0,4 m **intérieurs** de son unité réservée, contre `roadLeft` ou `roadRight`, et non les 0,4 m extérieurs                                                                                                                                                       | L'emprise d'une unité reste la donnée de [F 2.4], mais le mur qu'on touche borde la piste ; le reste de l'unité passe en décor derrière lui                                                  |
| 2026-09-15 | Les quatre coins d'un hazard portent leur propre `s`, lu par `TilePaths.axisParameter`, au lieu de partager celui du centre                                                                                                                                                              | Le dessus et les parois suivent alors le sol et la courbe du virage ; la validation ne lit que les points du plan, elle ne change pas ([F 2.4])                                              |
| 2026-09-15 | Les boucles se ferment par élagage : marge sur la distance à la case de fermeture, puis parcours des cases libres quand la marge se resserre, sous un budget global                                                                                                                              | Le tracé s'enferme dans lui-même bien avant d'être à court de tuiles, et la distance seule ne le voit pas ; le budget borne le coût d'un échec ([F 5.3])                                     |
| 2026-09-15 | La caméra vise `playerPose(position + 1)`, une tuile devant la position continue, et `packages/camera` ne change pas                                                                                                                                                                                                                                       | Le point glisse au lieu de sauter d'une tuile à chaque index franchi ; le lissage de `RigSolver` et `FollowCamera` suffisait déjà pour le reste ([F 3.9])                                                      |
| 2026-09-15 | Un écart de plus d'une tuile avec la dernière parcourue est un raccourci : l'index n'est pas adopté, la voiture est reposée et `race/cut` publié ; `car.home` suit la voiture de tuile en tuile                                                                                                                                                            | Le plus court chemin de `LapCounter` sert aussi ici ; et `home` à jour rend au reset manuel le sens qu'[F 3.8] lui donne, sans quoi il ressemblerait lui-même à un raccourci                                   |
| 2026-09-15 | `SpawnSpots` cherche la place libre la plus proche du point demandé — en travers d'abord, puis en avant sur l'axe — en testant le rectangle du châssis contre les emprises d'obstacles découpées en quadrilatères                                                                                                                                           | Le générateur pose les hazards entre 0,3 et 0,7, exactement là où la remise déposait la voiture ; jamais en arrière, pour ne pas repasser derrière la ligne ([F 3.8])                                          |
| 2026-09-15 | Les tuiles entrent et sortent de la fenêtre en fondu de 0,4 s, tenu par un `TileFader` sans état dont `TrackStage` garde la liste                                                                                                                                                                                                                          | Un service racine sert alors toutes les scènes, et une tuile reprise en cours de fondu repart de son opacité courante ([F 9.2])                                                                                |
| 2026-09-15 | `apps/web/src/app` se coupe en trois : `game/` le jeu, `lab/` les vitrines, `scene/` ce que les deux partagent ; `.dependency-cruiser.js` interdit à `game/` et `scene/` de lire `lab/` | Le lab est un banc d'essai, pas une bibliothèque : sans règle, le jeu aurait fini par en dépendre |
| 2026-09-15 | La plomberie 3D passe dans une base neutre `ScenePage` dont `PhysicsLab` hérite, au lieu d'un drapeau sur `PhysicsLab` | Une classe de plus plutôt qu'une condition : le jeu ne garde aucune référence au panneau de debug ni aux caisses du lab |
| 2026-09-15 | `DrivingPage` porte ce que la vitrine `lab/race` et l'écran de course partagent ; `RaceReadout` et `RaceHud` sortent le HUD de course dans `scene/` | Les deux pages montraient le même tableau de bord et lisaient le même état ; `.jscpd.json` ne tolère aucun doublon |
| 2026-09-15 | `MenuNavigation` : zone morte 0,5, premier pas au franchissement, attente 0,4 s puis répétition 0,12 s, et rien tant qu'une action tenue au départ n'est pas revenue au repos | Un stick maintenu doit dérouler une liste, et l'appui qui ouvre un écran ne doit pas être relu par l'écran ouvert (5.5) |
| 2026-09-15 | `MenuGrid` projette les cartes qu'on lui donne et pose la classe `hr-menu-picked` sur la courante depuis la boucle d'images | `TrackCard` reste une carte et n'apprend pas qu'elle peut être sélectionnée ([F 7.5]) |
| 2026-09-15 | `GameTracks` n'offre que les pistes d'exemple en mode Track que `TrackValidation` accepte | L'écran de choix ne doit montrer que ce qui se conduit ; les exemples fautifs restent au lab |

### 13.2 Questions ouvertes

| Réf. | Question                                                                                  |
| ---- | ------------------------------------------------------------------------------------------ |
| 4.2  | Les huit rangs de chaque environnement : quatre viennent du POC 1, les autres sont à doser |
| 4.8  | Ce que le déterminisme garantit, et ce qu'il ne garantit pas                                |

---

## Annexes

- A. Glossaire technique
  _Pas fixe, profil, fenêtre de tuiles, graine, couche de collision, scène, racine de composition... un mot, une définition._
- B. Schémas
  _Découpage des packages et dépendances, boucle de jeu, flux d'une entrée jusqu'au rendu, fenêtre de tuiles. Dans une page HTML à côté, comme les croquis fonctionnels._
