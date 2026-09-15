# HexRace - Plan de construction

> Dans quel ordre on construit le jeu, module par module, chacun jouable seul avant d'être assemblé.

Ce document complète les [spécifications techniques](specs-techniques.md) : elles disent quels
modules existent et ce que chacun possède, ce plan dit dans quel ordre on les écrit et comment on
sait qu'un module est fini. Les POC (`poc/car`, `poc/tile`) sont la matière première : on y prend
le code qui a fait ses preuves, on le réécrit dans le module qui le possède, avec l'injection de
dépendances et les tests, et on jette le reste.

## 1. Principes

### 1.1 Un module, une vitrine

Chaque module se construit **du bas vers le haut**, du plus commun au plus spécifique, et **chaque
module est jouable seul** avant qu'on passe au suivant. Jouable veut dire : une page de l'application
qui charge ce module et rien de plus haut que lui, où l'on peut le manipuler à la main. Pour les
entrées c'est une page qui affiche l'état courant des sticks, gâchettes et boutons, et qui montre les
palonniers sur mobile. Pour une tuile c'est une tuile en 3D dont on change les paramètres en direct.

Ces pages s'appellent les **vitrines** et vivent dans l'application, sous une route `lab/<module>`.
Elles ne sont pas jetables : elles restent le banc de réglage et de recette de chaque module pendant
toute la vie du projet, comme le panneau debug du POC voiture l'a été. Le jeu fini est l'assemblage
de ces mêmes modules sous une autre route.

### 1.2 Injection de dépendances Angular partout

Comme la spec technique 2.2 le décide, et sans exception : chaque classe d'un package est un service
`@Injectable({ providedIn: 'root' })` qui obtient ses dépendances par `inject()`. Pas de constructeur
à paramètres, ni dans le code ni dans les tests. Un test se fait avec `TestBed` : il remplace les
jetons dont il ne veut pas de la vraie implémentation, puis injecte le service testé. On ne se casse
pas la tête à construire des graphes d'objets à la main.

Ce qui vit moins longtemps que l'application, une course ou une scène de l'éditeur, est fourni dans
un **injecteur enfant** créé avec la scène et détruit avec elle.

### 1.3 Ce qu'on reprend de hexact, et ce qu'on change

On reprend l'ossature : workspaces npm `packages/*` et `apps/*`, packages consommés en source par
alias `paths` sans build de bibliothèque, un seul projet Angular, `tsconfig.base.json` strict,
Vitest par package avec seuils de couverture, ESLint typé, dependency-cruiser pour les frontières,
jscpd, knip, le Makefile découpé en `make/*.mk` avec Node épinglé par nvm et un `make check` qui ne
lance que ce que le diff touche.

On change ce qui découle de la DI partout et de la 3D :

- **Les règles ESLint maison de hexact ne sont pas reprises telles quelles.** « Un export par
  fichier » et « pas de fonction libre » ont un sens dans un moteur de règles pur ; ici on garde ce
  qui protège vraiment (types stricts, imports de type, taille des fichiers et des fonctions,
  complexité, `prefer-on-push`) et on décide règle par règle au moment du squelette. La règle sur
  les commentaires (`comment-ration`) est reprise telle quelle : un commentaire est rationné par ce
  qu'il documente.
- **La couverture est à 100 % partout** (relevé le 2026-09-13, après un premier temps à seuils par
  package). Les sous-modules `physics` et `render` s'écriront pour être testés à travers leurs
  jetons (physique factice, rendu factice) et de faux contextes, comme le dessin du HUD l'est déjà ;
  ce qui ne se teste pas sans navigateur se met derrière une interface qui, elle, se teste.
- **La pureté est une propriété d'un sous-module, pas d'un package** : `entity` ne lit ni Jolt ni
  three.js, et c'est dependency-cruiser qui le tient. Un package entier n'est jamais « pur » au sens
  de hexact, il a Angular.

### 1.4 Quand un module est fini

Un module passe au suivant quand :

1. sa vitrine tourne (`make serve`, route `lab/<module>`) et fait ce que sa fiche ci-dessous décrit ;
2. ses tests passent avec le seuil de couverture de son package ;
3. `make check` est vert : types, lint, frontières, duplication, code mort ;
4. son barrel `index.ts` dit en cinq lignes ce qu'il expose et ce qu'il refuse ;
5. la spec technique a sa section remplie pour ce module, au moins ce qui a été décidé en le codant.

## 2. Les modules, dans l'ordre

Les packages sont ceux de la spec technique 2.1, plus deux que la spec sous-entend sans les nommer :
`commons` (le vocabulaire partagé et l'EventBus) et `engine` (la boucle, les scènes, GameObject /
Component, et les deux services qui enveloppent three.js et Jolt). À acter dans la spec au moment du
squelette.

| Ordre | Module                                  | Ce qu'il possède                                                         | Sa vitrine                                                                    |
| ----- | --------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| 0     | squelette                               | workspace, app, Makefile, qualité, route `lab/`                          | page d'accueil du lab qui liste les vitrines                                  |
| 1     | `inputs`                                | actions, sources manette / clavier / tactile, fusion, palonniers         | état des entrées en direct, palonniers sur mobile                             |
| 2     | `hud/debug`                             | lil-gui enveloppé, avec courbes, persistance, export et tracé du POC     | un panneau de démonstration : dossiers, curseurs, relevés, courbes            |
| 2 bis | `hud/game`, `hud/commons`, `hud/dialog` | tous les composants de la spec 7.5 qui ne dépendent d'aucun module       | `lab/hud` : une fausse course pilotée par le panneau debug                    |
| 3     | `commons` + `engine`                    | EventBus, boucle à pas fixe, scènes, GameObject, rendu three, Jolt       | une scène vide avec un sol, une boîte qui tombe, le compteur d'images         |
| 4     | `camera`                                | la caméra de la spec 3.9, hauteur selon la vitesse, visée                | la caméra suit un mobile factice qu'on pilote au stick                        |
| 5     | `tile`                                  | `entity` du POC 2, `render` d'une tuile, `physics` de son collider       | une tuile dont on change chaque paramètre en direct, zones colorées           |
| 6     | `track`                                 | format de fichier, validation, générateur, assemblage, fenêtre           | le POC 2 refait : charger ou générer, caméra libre, curseur joueur            |
| 7     | `car`                                   | `entity`, `render`, `physics` du POC 1, sons, traces, particules         | le POC 1 refait : la voiture sur un sol plat multi-surfaces                   |
| 8     | `game-commons`                          | machine à états d'une partie, compte à rebours, chrono, résultats        | la voiture sur une piste : le POC 3 que l'on n'a jamais fait, chrono au tour  |
| 9     | `game/track`, `hud/menus`               | mode Track, menus, branchement du HUD sur les vraies valeurs, sauvegarde | le MVP de la spec fonctionnelle 10.4, sous la route du jeu et non plus du lab |
| 10+   | `editor`, `rally`, ...                  | dans l'ordre d'envie de la spec fonctionnelle 10.5                       | une vitrine par module, même règle                                            |

Les fiches qui suivent détaillent chaque étape. Elles sont écrites avant de coder et complétées
après : ce qui a été décidé en cours de route y va, puis passe dans la spec technique.

### 2.0 Squelette

Le dépôt prend la forme de hexact : `packages/`, `apps/web`, `make/`, `quality/`, `angular.json` à la
racine. L'application démarre sur une page `lab/` qui liste les vitrines disponibles ; le jeu lui-même
n'existe pas encore. Les gates tournent à vide et sont verts. La spec technique 2.6 (structure des
dossiers) s'écrit ici.

**Tranché au squelette (2026-09-12).** Textes de l'interface en anglais (spec fonctionnelle 9.4),
comme le code. ESLint : `recommended` et `stylistic` typés de
typescript-eslint, sonarjs avec complexité cognitive à 20, 300 lignes par fichier et 50 par fonction
hors specs, imports de type inline, pas de chemin relatif, angular-eslint avec `prefer-on-push` et le
préfixe `hr`, et une règle propre à HexRace qui refuse tout paramètre de constructeur. Couverture :
100 % sur les packages tant qu'ils n'ont que de l'`entity`, 90 % sur l'application ; les seuils de
`physics` et `render` se fixeront quand ils existeront. Angular Material : plus tard, avec les menus.
Le rétrécissement de `make check` au diff, comme dans hexact, viendra quand la durée le justifiera.
Ajoutés le 2026-09-13 : la porte `quality-types` (type-coverage à 100 %, aucun `any` même implicite)
et la règle `directory-size` de hexact (avertissement au-delà de 20 fichiers par dossier, erreur
au-delà de 30) ; couverture de tests à 100 % sur les trois projets.

### 2.1 `inputs`

**Ce qu'il possède.** La couche d'actions de la spec technique 5.1 : accélérer, freiner / marche
arrière, tourner, frein à main, reset, et les actions de menu (naviguer, valider, retour). Les trois
sources, manette, clavier, tactile, chacune derrière le même jeton, et la fusion en un instantané lu
au début de chaque pas. Le mapping est celui de la spec fonctionnelle 3.3. La manette et le clavier
viennent du POC voiture (`poc/car/src/engine/input`), le tactile est à écrire : palonnier vertical à
gauche, horizontal à droite, bouton frein à main au milieu, multi-touch, page qui ne défile ni ne
zoome.

**Sa vitrine.** Une page qui affiche en direct chaque action fusionnée et, en dessous, chaque source
séparément : sticks dessinés, gâchettes en barres, boutons allumés, source active. Sur mobile, ou
quand on le demande, les palonniers tactiles apparaissent par-dessus et leur toucher se voit dans les
relevés. C'est aussi là qu'on règle les zones mortes et le lissage du clavier.

**Fini quand** un même geste sur les trois périphériques donne la même action, et que les palonniers
se testent sur un téléphone.

**Fait le 2026-09-12.** `InputActions` porte les actions et rien du matériel : throttle, brake,
steer, handBrake, reset, navigateX/Y, confirm, back. Chaque source est un service injectable qui lit
le DOM par le jeton `DOCUMENT` et produit directement des actions ; `INPUT_SOURCES` est un
multi-provider et `provideInputSources()` branche les trois. La fusion `Inputs` prend le maximum des
analogiques, additionne et borne direction et navigation, et retient la dernière source engagée. Le
tactile expose ses palonniers sans rien dessiner ; c'est la vitrine qui les dessine (composant dans
l'app, à reprendre dans `hud/game` quand il existera). Vérifié dans Chrome au clavier et au toucher
simulé, puis sur téléphone le 2026-09-13 : les palonniers sont validés. Décision prise en route :
commentaires et tests en anglais, et la règle `comment-ration` de hexact reprise.

### 2.2 `hud/debug`

**Ce qu'il possède.** Le panneau de debug de la spec fonctionnelle 7.5 : **lil-gui repris tel quel**
(décision du 2026-09-13, qui annule le panneau Angular du 2026-09-10), enveloppé dans un service
injectable qui le crée, le montre et le cache d'une touche, et complété des ajouts du POC voiture
(`poc/car/src/engine/debug`) : l'éditeur de courbes, la persistance des valeurs dans le stockage
local, l'export des valeurs pour les reporter dans le code. S'y ajoutent un tracé en temps réel d'une
grandeur et le compteur de performance. Chaque module suivant expose ses réglages en s'enregistrant
auprès de ce service, comme les composants du POC le faisaient avec `registerDebug`. Angular
Material n'entre pas ici : il arrivera avec les premiers écrans du jeu, ou plus tôt si une vitrine en
a besoin.

**Sa vitrine.** Un panneau qui pilote un objet de démonstration et montre chaque type de contrôle, y
compris une courbe et un tracé en temps réel. La vitrine `inputs` migre ses trois curseurs dessus.

**Fait le 2026-09-13.** Package `hud`, sous-module `debug`. `DebugPanel` (service) crée lil-gui à la
première demande, caché, et le bascule avec la touche `\``. `register(title, build, destroyRef)`
construit un dossier, restaure ses valeurs depuis le stockage local (`DebugStore`, une clé par
dossier, relevés et boutons exclus), les sauve à chaque changement, lui ajoute un « Reset folder »
et le détruit avec son propriétaire. La racine porte le dossier Performance (`PerfMeter`: fps,
durée d'image, durée du pas physique que le moteur renseignera, tracé des fps, case pour le coin
d'écran`PerfCorner`), « Copy values as JSON » (valeurs courantes contre valeurs initiales) et
« Reset all ». Les ajouts du POC sont portés : `addCurveEditor`(découpé en mise en page, peinture et
DOM pour tenir dans les tailles de fichier) et le nouveau`addPlot`, tracé glissant qui s'échantillonne
lui-même et s'arrête quand son canvas quitte la page. `startFrameLoop`vit ici et sert à toutes les
vitrines. La vitrine`inputs` a migré ses réglages dans un dossier Inputs. Vérifié dans Chrome :
contrôles, courbe, tracés, persistance, reset, bascule clavier, coin fps, destruction du dossier au
changement de page. Le dessin sur canvas se teste avec un faux contexte 2D (`canvas.mock.ts`).

**Le reste du `hud`** (compte-tours, rapport, vitesse, dégâts, chrono, cartes, conteneur de canvas…)
arrive module par module quand le module qui produit la donnée existe : le compte-tours avec `car`, le
chrono avec `game-commons`, les cartes avec `game/track`. L'inventaire complet est en spec
fonctionnelle 7.5.

### 2.2 bis `hud/game`, `hud/commons`, `hud/dialog`

**Ce qu'il possède.** Les composants propres au jeu de la spec fonctionnelle 7.5, écrits avant les
modules qui produiront leurs valeurs : chaque composant est une fonction de ses entrées et ne connaît
ni voiture ni piste. `game/` : compte-tours (arc SVG, zone rouge, clignotement au rupteur), rapport
(flash au changement), vitesse, dégâts (voiture vue du dessus en SVG, douze éléments à pourcentage,
couleur continue, pulsation au coup), chrono (tour, meilleur, écart ; temps de passage en Rally ;
temps tenu en Collapse), compte à rebours, jauge de reset, faux sens, témoins d'assistance, palonniers
tactiles (déplacés depuis la vitrine des entrées). `commons/` : conteneur de canvas (adopte un canvas
et remonte sa taille par ResizeObserver), barres de caractéristiques, solde de crédits, cartes de piste
et de voiture, format des temps. `dialog/` : la boîte de résultats sur Material Dialog et le service
qui l'ouvre et rend le choix. Angular Material et Material Symbols entrent ici : thème sombre unique
dans `styles.scss`, police d'icônes servie en local par le paquet `material-symbols` pour rester
utilisable hors ligne.

**Sa vitrine.** `lab/hud` : une fausse course dans le dossier HUD du panneau debug (régime, rapport,
vitesse, mode et chrono qui tourne, dégâts par élément et bouton « Hit! », compte à rebours, jauge,
faux sens, témoins, crédits, boîte de résultats), tous les composants posés sur un cadre 16/9 comme
en course, et les composants de menus en dessous.

**Fait le 2026-09-13.** Décisions prises en route : les animations rejouées (flash, pulsation,
chute) passent par l'API Web Animations depuis un `effect`, Angular signalant la recréation
d'éléments par `@for` comme coûteuse ; le package `hud` est testé par le builder de tests Angular
(`ng test hud`, déclaré dans `angular.json`), parce que les entrées `input()` par signal ne sont pas
reconnues par le compilateur JIT brut de Vitest ; le contrat d'affichage des dégâts (`DamageReadout`,
douze éléments en pourcentage) vit dans le `hud` et `car` le produira. Reste au `hud` : l'aperçu des
tuiles suivantes (avec `track`), le front de disparition (avec Collapse), les menus et options (avec
les écrans du jeu).

### 2.3 `commons` et `engine`

**Ce qu'ils possèdent.** `commons` : le vocabulaire partagé, l'EventBus typé de la spec technique 2.2,
le générateur aléatoire à graine du POC 2. `engine` : la boucle à pas fixe avec accumulateur et
interpolation (spec 2.4), les scènes et l'injecteur enfant par scène, GameObject / Component repris de
rally-game, un service de rendu qui possède le renderer three.js et le canvas persistant, un service
de physique qui possède Jolt et son pas. Les deux derniers sont derrière des jetons, avec une
implémentation factice pour les tests.

**Sa vitrine.** Une scène minimale : un sol, une boîte qui tombe dessus, le compteur d'images et le
temps de pas physique. C'est là qu'on mesure le poids du wasm et son temps de démarrage sur mobile
(spec technique 1.4, `<TODO>`).

**`commons` fait le 2026-09-13.** Trois choses et rien de plus : `EventBus`, typé par l'interface
`HexraceEvents` que chaque package augmente par fusion de déclarations, avec `on`, `once` et
`publish` synchrone ; `Random`, la seule source d'aléa du jeu, `seeded(graine)` pour ce qui doit se
rejouer et `fresh()` pour ce qui doit seulement avoir l'air aléatoire, sur le sfc32 du POC 2 ; et
l'arithmétique partagée (`lerp`, `inverseLerp`, `ramp`, degrés, km/h). Pas de vitrine : rien à voir,
la vitrine de l'étape est celle d'`engine`. Couverture et type-coverage à 100 %.

**`engine` fait le 2026-09-13.** `GameLoop`, la boucle à accumulateur de rally-game (pas de 1/60 s,
image plafonnée à 0,1 s, cinq pas au plus puis abandon du retard), qui expose `alpha`, `stepMs` et
`frameMs` ; `Scenes.create()` fabrique une `Scene` avec son injecteur enfant (`createEnvironmentInjector`),
dans lequel `instantiate` construit les composants pour que leurs `inject()` résolvent, et `destroy`
emporte l'arbre et l'injecteur ; `GameObject` / `GameComponent` (renommé le 2026-09-14) sans paramètre de constructeur, les
données par champs publics posés avant `add`. Deux services nommés pour ce qu'ils sont, sans
interface ni jeton devant (décision du 2026-09-13) : `ThreeRenderer` (WebGL créé au premier rendu,
canvas persistant, ratio de pixels plafonné à 2 ; les tests remplacent `WebGLRenderer` par `vi.mock`
ou espionnent `render`) et `JoltPhysics` (wasm chargé à `load()`, deux couches, écouteur de contacts
qui distribue `onCollisionEnter` ; les tests tournent sur le vrai Jolt). Quatre composants : `MeshComponent`, `BodyComponent` (interpole le
maillage entre les deux derniers pas par `alpha`), `CameraComponent`, `LightComponent`. La vitrine
`lab/engine` charge sa route paresseusement (three et le wasm restent hors du bundle initial :
500 ko au départ, 4,5 Mo bruts pour le morceau engine),
mesure le démarrage du wasm (`jolt-physics.wasm-compat`, 3,2 Mo en base64 dans le JS ; passer au
`.wasm` séparé, 2 Mo, si le démarrage mobile le réclame) et fait tomber des caisses depuis le panneau.
Le wasm se charge aussi sous Vitest, ce qui a décidé de l'absence de doublure.

### 2.4 `camera`

**Ce qu'il possède.** La caméra de la spec fonctionnelle 3.9 : vue du dessus qui suit l'orientation
du joueur, hauteur qui monte avec la vitesse, visée vers la prochaine tuile quand `track` existera.

**Sa vitrine.** Un mobile factice qu'on pilote au stick sur le sol de la vitrine `engine`, la caméra
qui le suit, les réglages dans le panneau debug.

**Fait le 2026-09-13.** `CameraTarget`, ce que la caméra lit de ce qu'elle suit (position, cap,
vitesse, tuile suivante ou null) ; `solveRig`, le calcul pur dans `entity/` : la caméra se place
derrière la cible le long d'un cap mêlé entre celui de la cible et la direction de la tuile suivante
par le facteur `anticipation` (plafonné par `anticipationMaxDeg`), à une hauteur qui monte avec la
vitesse entre `heightAtRest` et `heightAtSpeed`, et vise `lookAhead` mètres devant sur le même cap ;
`FollowCamera`, le composant qui pilote le `CameraComponent` voisin avec un lissage exponentiel et un
`snap` pour les téléportations ; `CameraTuning`, les réglages en service unique. Remis d'aplomb le
2026-09-14 : `entity/` ne garde que `CameraTarget` et `RigPose`, le calcul est le service `RigSolver`
dans `follow/` avec le réglage. La vitrine
`lab/camera` fait rouler un mobile cinématique au stick ou au clavier (palonniers sur tactile) sur
un sol quadrillé, avec un anneau au sol pour tuile suivante factice dont le relèvement et la
distance se règlent, pour juger l'inclinaison. Question ouverte : une caméra fixe pour le garage se
fera avec le seul `CameraComponent` de l'engine posé à la main, rien à ajouter ici tant que le
garage n'existe pas.

### 2.5 `tile`

**Ce qu'il possède.** `entity` : le modèle du POC 2 (`poc/tile/src/model`), déjà testé, repris avec
ses tests. `render` : la géométrie 3D d'une tuile, ses zones en couleurs. `physics` : le collider
d'une tuile pour Jolt, et le revêtement sous une position locale, ce que le POC 3 devait valider.

**Sa vitrine.** Une seule tuile, chaque paramètre du modèle dans le panneau, la géométrie et le
collider qui suivent.

**Fait le 2026-09-13.** `entity/` reprend le modèle du POC 2 en unités, sans three ni Jolt, avec
ses tests portés et complétés à 100 %. Les données restent des interfaces (`Profile`, `Tile`,
`TileSweep`, `Obstacle`) et l'arithmétique sans état des fonctions (faces et heures, `Vec2`, axe
local, Hermite et Steffen) ; tout ce qui est une capacité est un service `providedIn: 'root'`
obtenu par `inject()`, avec ses réglages en champs : `TileSweeper` (bords des zones, centre de
piste, hauteurs), `TileGeometry` (tranches, quadrilatères, polygones, contour ; `samples` par sortie
et `apexRadius`), `TileObstacles` (emprises, erreurs), `TileLines` (damier), `TileSurfaces` (le
revêtement sous un point, spec technique 4.2), `Environments` (la palette), `TileTriangles` (la liste
de triangles **en mètres** partagée par le maillage et le collider, chaque triangle enroulé normale
vers le haut ou l'extérieur parce que Jolt ne collisionne qu'avec la face avant d'un maillage).
`render/` : `TileMeshes`, le maillage three à couleur par sommet (plat ou lissé) et le contour ;
`physics/` : `TileBodies`, qui injecte `JoltPhysics` et fait le corps statique en `MeshShape`. Remis
d'aplomb le 2026-09-14 ([plan](remise-d-aplomb-tile.md)) : `entity/` n'est plus que de la donnée,
la logique est dans `geometry/` en quinze services, un par fichier (`Units`, `Faces`, `Profiles`,
`Grid`, `Layout`, `TilePaths`, `Slopes`, `Environments`, `TileSweeper`, `TileGeometry`,
`TileObstacles`, `TileLines`, `TileSurfaces`, `TileValidation`, `TileTriangles`), `Vec2` et `Vec3`
sont des objets-valeurs de `commons`, les erreurs sont des `TileIssue` à code, et deux règles de lint
plus deux règles dependency-cruiser tiennent la forme. Ce qui
reste à la piste (`track`) : le profil d'entrée, les pentes aux faces, le placement, les marques de
départ et d'arrivée, la validation, le fichier, le générateur et la fenêtre. La vitrine `lab/tile`
édite chaque champ dans le panneau, reconstruit maillage et collider à chaque changement, affiche
les erreurs du modèle, lit le revêtement sous le pointeur et fait tomber des caisses sur le collider.
Les rampes et dos d'âne restent plats : leur volume viendra avec la voiture. Le type de paysage
bascule au milieu de la tuile comme les autres types (spec 2.1) ; le POC gardait celui de l'entrée.

### 2.6 `track`

**Ce qu'il possède.** Le format de fichier acté (spec technique 3.3), la validation (5.5), le
générateur à graine, l'assemblage des tuiles en piste, la fenêtre de tuiles selon la position du
joueur.

**Sa vitrine.** Le POC 2 refait dans le vrai code : charger une piste depuis un fichier, en générer
une depuis une graine, caméra libre, curseur « position du joueur », tuiles fautives surlignées. La
carte 2D du POC 2 y revient, candidate à l'aperçu du HUD.

**Fait le 2026-09-14.** `entity/` porte la donnée seule (`Track`, `TrackMode`, `PlacedTile`,
`Placement`, `Overlap`, `LineMark`, `Cursor`, `PlayerPose`, `TrackIssue`, `TrackReview`,
`TrackFileError`, `Dials`, `GeneratorConfig`) et les neuf pistes d'exemple, gardées comme **textes
de fichier `.track`** dans `entity/examples/` : une donnée, et la garantie que le format tient
puisque réécrire ce qu'on a lu redonne le fichier octet pour octet. `geometry/` en sept services :
`TrackProfiles` (piste fermée ou non, profil d'entrée d'une tuile, les deux profils),
`TrackPlacement` (pose sur la grille depuis `ORIGIN`, fermeture de la boucle, recouvrements, préfixe
valide), `TrackSlopes` (pente à chaque face par Steffen, en boucle la face 0 et la face n sont la
même), `TrackSweeps` (le `TileSweep` d'une tuile posée, la transition de l'environnement, le plancher
de jupe commun, le `TileBuild` de chaque tuile), `TrackMarks` (départ et arrivée selon le mode, pas
d'épingle sous une ligne), `TrackWindow` (curseur continu, indices devant et derrière, pose du
joueur), `TrackValidation` (tout 5.5 en `TrackIssue` à code : en-tête, profils, obstacles, fermeture,
auto-intersection, pente par sorte de sortie, amplitude, épingle sous une ligne). `format/` :
`ObstacleText`, `TileText` et `TrackFiles` pour la grammaire 3.3, chaque problème avec son numéro de
ligne, colonnes alignées à l'écriture ; `TrackExamples` sert les exemples lus. `generation/` :
`GeneratorConfigs` (la chaîne `europe:hexrace:t5s3r4v4o3:n30`), `ExitChoices`, `ProfileSteps`,
`ObstacleSeeder` et `TrackGenerator`, retour arrière borné compris ; toute piste générée passe la
validation, vérifié sur quatre jeux de cadrans et cent graines. `render/TrackMeshes` fait un groupe
par tuile pour que la fenêtre les pose et les retire une à une, contour rouge sur une tuile fautive ;
`physics/TrackBodies` fait le corps statique de chaque tuile sur les mêmes triangles.

Décidé en route : le générateur construit ses tuiles avec la transition de l'environnement, sinon un
obstacle accepté à la génération déborde à la validation ; `GENERATOR_SLOPE_FACTOR` et `MAX_SLOPE`
sortent du barrel de `tile` (deux exports ajoutés, seule retouche à `tile`). La vitrine `lab/track`
charge un exemple, un texte collé dans la page ou une piste tirée d'une graine, montre la carte 2D à
côté du cadre 3D, promène un curseur « position du joueur » qui charge et décharge maillages et
colliders, liste ce que la validation refuse et laisse tomber une caisse sur la route. Ce qui reste :
le mode Collapse et son front de disparition (avec `game/collapse`), l'aperçu des tuiles suivantes
dans le HUD (la carte 2D est le brouillon), et l'éditeur qui prolongera une piste tuile à tuile.

### 2.7 `car`

**Ce qu'il possède.** `entity` : le modèle d'une voiture, ses caractéristiques (masse, centre de
gravité, braquage dégressif, transmission), ses options de garage. `physics` : le contrôleur véhicule
Jolt du POC 1 avec le grain, les assistances, la boîte auto. `render` : la caisse, les roues, les
traces, les particules. Et les quatre couches de son procédural du POC 1, derrière le hub audio. Tout
ce qui est « par revêtement » (grip, traces, sons, particules) reste à un seul endroit, à décider entre
`tile` et `car` au moment de l'écrire.

**Sa vitrine.** Le POC 1 refait : la voiture sur un sol plat découpé en zones de revêtements, avec la
rampe et le dos d'âne. C'est ici que se termine ce que le POC 1 avait laissé : la glace, les barrières,
la caméra de la spec, le tactile en conduite, la mesure à 30 images par seconde sur mobile, et les
deux rendus de la spec fonctionnelle 8.1.

**Fait le 2026-09-14.** `entity/` porte la donnée seule : `CarSpec` (caisse et masse, roues et
suspensions, moteur, boîte, braquage dégressif, transmission), `CarOptions` (ABS, contrôle de
traction, aileron, plus l'amortissement de lacet du tactile, tous coupés au départ), `CarState`
(l'instantané que lisent le HUD, le son et le panneau), `CarReadout` (état, contacts de roue,
pose) par lequel `render/` et `audio/` lisent `physics/` sans se connaître, `SurfaceProbe` (ce que
l'appelant répond sur le sol sous un point) et **le tableau par revêtement**, `SURFACE_CATALOG` :
onze `SurfaceFeel` nommés par leur caractère (`firm`, `worn`, `rough`, `loose`, `soft`, `boggy`,
`turf`, `packed`, `deep`, `slick`, `rocky`), rangés par environnement, zone et rang. `drive/` est
la logique pure en services : `Surfaces` (la lecture du catalogue), `Steering` (courbe de réponse
et braquage dégressif), `Assists` (ABS et contrôle de traction sur le glissement longitudinal),
`Grain` et `Noise` (les bosses virtuelles et la force latérale bruitée), `EngineModel` (part de
régime, rupteur, invite au passage), `Drivetrain` (boîte manuelle, embrayage), `Ramps` (le seuil
à deux bornes du POC). `physics/` : `CarBodies` (corps, `VehicleConstraint`, différentiels selon
la transmission), `CarController` (le composant qui lit les entrées, mène la contrainte, tient les
courbes de friction sous chaque roue, ajoute traînée, grain, lacet et appui, publie
`car/collision`, `car/shift`, `car/reset`, et **est sa propre `CameraTarget`**), avec
`WheelContacts`, `CarPoses`, `CarForces`, `WheelSurfaces`, `ChassisAxes`, `ManualGearbox`,
`CarTelemetry`. `render/` : `CarMeshes` et `CarView` (caisse, cabine, quatre roues, repère du
centre de gravité), `SkidMarks` (ruban par roue, couleur et opacité du revêtement) et
`CarParticles` sur `Puffs` (bouffées et débris). `audio/` : `AudioHub`, le seul endroit qui touche
Web Audio (contexte au premier geste, worklets chargés depuis leur texte par Blob URL), et les
trois couches procédurales du POC reprises telles quelles, `EngineSound`, `TyreSound` et
`ChassisSound` sur une base commune `SurfaceSound` (une voix par rang de la palette).

La vitrine `lab/car` : le sol plat découpé en huit bandes, une par rang de l'environnement choisi
dans le panneau (Europe, Nord, Afrique), la rampe et le dos d'âne du POC, la conduite à la manette,
au clavier ou aux palonniers tactiles, la caméra de la spec 3.9 à la place de la caméra de
poursuite, le compte-tours, le rapport, la vitesse et les témoins d'assistance du `hud` par-dessus,
et dans le panneau : masse et équilibre, moteur, boîte, direction, options de garage, sol, son
(niveaux, tests, réglages par revêtement), traces, particules et obstacles. Le son démarre au
premier geste ou sur le bouton « Start sound ».

Décidé en route : **le tableau par revêtement vit dans `car`**, pas dans `tile`, parce que `tile`
ne connaît qu'un rang et une couleur ; le son procédural du POC est gardé tel quel, aucun
échantillon ; ce que Jolt ne lit qu'à la construction d'un corps (masse, moteur, rapports) se
réapplique en reconstruisant la voiture au relâchement du curseur, pas à chaque pixel ; le bruit
de grain est une valeur-noise maison, `simplex-noise` n'entrant pas dans les dépendances. Seule
retouche à un voisin : `JoltShape` exporté par `engine`.

**Ce qui reste.** Les dégâts et les sons de collision (décision de Gérald : plus tard, la collision
ne publie qu'un événement) ; la passe de réglage du son et du grain que le TODO du POC réclame ;
les valeurs des huit rangs de chaque environnement, un premier jet hors des quatre revêtements
validés au POC ; le chrono au tour (avec `game-commons`), les barrières, la mesure à 30 images par
seconde sur mobile et les deux rendus de 8.1.

### 2.8 `game-commons`

**Ce qu'il possède.** Le tronc commun de la spec fonctionnelle 4.1 : compte à rebours, départ,
chrono, tour bouclé, fin, résultats. Une machine à états, l'EventBus pour prévenir le HUD et le son.

**Sa vitrine.** La voiture sur une piste chargée par `track`, chaque roue prenant le revêtement de sa
tuile, le chrono au tour dans le panneau. C'est le POC 3 de la spec, fait pour de vrai : il valide les
critères de la spec fonctionnelle 10.3.

**Fait le 2026-09-14.** `entity/` porte la donnée seule : `RaceState` et `RacePhase` (l'instantané
d'une course, phase, pas du compte à rebours, chrono, tour sur N, sens interdit et **position
continue**), `RaceRules` (mode et nombre de tours, `DEFAULT_LAPS` = 2, lus à côté de la piste pour
qu'un panneau puisse raccourcir une course sans toucher au fichier), `SpawnPose`, `SavedTimes` avec
la clé `hexrace.best.v1`, et les quatre événements du bus, `race/start`, `race/lap`, `race/finish`,
`race/fall`. `race/` est la course sans scène, en services : `CountdownTimer` (3, 2, 1, GO lus sur
l'horloge, le GO tenu une seconde de plus), `RaceClock` (le chrono, qui ne s'arrête qu'à l'arrivée),
`LapCounter` (le franchissement d'une ligne dans le sens de la marche), `BestTimes` (le meilleur
temps par piste dans le stockage local) et `RaceMachine`, le tronc commun de la spec 4.1 : compte à
rebours, GO, chrono, tours, fin, record. `stage/` est ce que la scène tient : `TrackStage` (la piste
posée une fois, puis un `GameObject` par tuile de la fenêtre, maillage et collider, ajoutés et
détruits quand elle bouge — spec 9.2), `TrackProbe` (le revêtement sous une roue, répondu par la
tuile qui tient le point), `FallWatch` (le plancher de la jupe moins une marge) et `RaceDirector`,
le `GameComponent` qui marie tout : chaque pas il situe la voiture sur la piste, déplace la fenêtre,
vise la tuile suivante pour la caméra, appelle le sens interdit, gèle la voiture sous le compte à
rebours, fait tourner la course et repose la voiture quand elle tombe.

Retouches aux voisins : `Clock` dans `commons` (l'horloge réelle derrière un jeton, qu'un test
remonte à la main) ; `TrackLocator` dans `track` (l'inverse de `TrackWindow` : d'un point du plan à
la tuile qui le tient et à la position continue, la recherche partant de la tuile du pas d'avant) ;
`frozen` sur `CarController` (pédales et volant ignorés, freins serrés) ; et, en finissant la
vitrine, `CarController.reset()` qui relit la pose tout de suite, pour que la caméra, le directeur
et les traces ne voient plus une image de retard après une remise en place.

La vitrine `lab/race` : la piste vient d'un exemple, d'une graine ou du texte d'un fichier `.track`,
elle est validée puis posée dans le `TrackStage` — une piste que le modèle refuse roule quand même,
ses problèmes listés sous le chrono ; la voiture est celle de `lab/car` (caisse, traces, particules,
trois couches de son), posée sur la ligne par le directeur, suivie par la caméra de la spec 3.9 dont
l'anticipation joue enfin sur une vraie tuile suivante ; par-dessus le canvas, le compte à rebours,
le chrono avec tour n sur N, le sens interdit, le compte-tours, le rapport, la vitesse, la jauge de
reset, les témoins d'assistance et les palonniers sur tactile ; à l'arrivée, la boîte de résultats du
`hud`, Retry qui relance et Home qui rend au lab. Le panneau porte le choix de la piste et les
cadrans du générateur, le mode et le nombre de tours, la fenêtre de tuiles et l'ombrage, la vitesse
au-delà de laquelle on parle de sens interdit, la marge de chute, l'anticipation de la caméra, les
boutons Restart, Start sound et Clear best time, et les relevés en lecture seule : phase, tour,
chrono, position continue, tuile, meilleur temps. Les réglages de la voiture ne sont pas refaits
ici : `lab/car` en est le banc, et les deux pages partagent les mêmes services.

Décidé en route : **le chrono tourne sur l'horloge réelle** (`Date.now()` derrière `Clock`, parce
que `commons` ne compile pas le DOM et n'a donc pas `performance`), ce qui applique le temps passé
dans un onglet caché sans simuler la physique manquante (spec technique 2.4) ; **la position sur la
piste est un seul nombre**, partie entière la tuile et fraction l'avancement dessus, celui-là même
que `TrackWindow` lit, ce qui donne la fenêtre, le tour et le sens interdit d'un seul relevé ; le
franchissement se mesure **par le plus court chemin sur la boucle**, donc un aller-retour sur la
ligne ne compte aucun tour ; la voiture part **sur la ligne, à peine passée**, pour que son premier
passage soit bien un tour ; la chute, c'est **sous le plancher de la jupe moins une marge**, et la
voiture revient au centre de la dernière tuile parcourue, à l'arrêt (spec 2.7 et 3.8) ; les records
vivent sous `hexrace.best.v1`, un document illisible étant jeté plutôt que migré ; le HUD reçoit
**tour n sur N sans meilleur tour ni écart**, la spec 4.2 refusant le chrono au tour ; les dégâts
restent hors périmètre. En finissant la vitrine : `RaceDirector.restart()` **repose aussi la voiture
sur la ligne**, sans quoi « recommencer » laissait la voiture où elle était ; et ce que `lab/car` et
`lab/race` ont en commun est sorti une fois pour toutes — `CarDash` et `CarGauges` pour le tableau
de bord, `IssueList` pour les problèmes d'une piste, `GeneratorPanel` pour les cadrans du générateur,
`PhysicsLab.followCamera` et `PhysicsLab.showPanel` pour la caméra de suivi et le dossier du panneau,
et deux feuilles `_lab-page.scss` et `_lab-hud.scss` pour l'habillage d'une page du lab.

**Ce qui reste.** Les cinq critères de la spec 10.3 ne se cochent qu'en conduisant : c'est à Gérald
de dire si une suite de tuiles valides passe sans accroc, si les changements au milieu d'une tuile se
conduisent bien, si une sortie légère sur le bas-côté à la jonction ne fait pas tomber, si la hauteur
maximale par tuile est la bonne, et si la fenêtre d'affichage se voit à la vitesse de pointe. Le mode
Collapse (piste qui se dérobe), les secteurs et les fantômes ne sont pas dans ce package et ne le
seront que s'ils arrivent dans la spec ; les dégâts et les sons de collision attendent toujours ; le
son n'est pas branché sur la course (pas de bip de compte à rebours ni de jingle d'arrivée) ; et la
piste, la voiture et la course ne se choisissent encore que dans le panneau debug, les menus étant
l'affaire de 2.9.

### 2.9 `game/track` et le `hud`

**Ce qu'il possède.** Le mode Track, les menus, le HUD de course, l'écran de résultats, la sauvegarde
locale du meilleur temps. Première route qui n'est pas une vitrine : le jeu.

Depuis 2.8, l'écran de résultats (`ResultsDialogs`), la sauvegarde du meilleur temps (`BestTimes`) et
le branchement du HUD sur les vraies valeurs existent et tournent dans `lab/race` : il reste à les
mettre sous une route du jeu, avec les menus, le choix de la piste et de la voiture, et le retour au
menu plutôt qu'au lab.

**Fini quand** le MVP de la spec fonctionnelle 10.4 se joue de bout en bout, à la manette et au
tactile.

**Écrit (2026-09-15).**

**Le sous-module `hud/menus`.** Trois fichiers. `MenuNavigation` transforme les valeurs continues de
`Inputs` en gestes discrets (spec technique 5.5) ; il tourne dans sa propre boucle d'images, se
déclare dans les `providers` de chaque menu pour que deux menus n'aient pas le même état de
répétition, et refuse de lire une action déjà tenue avant son arrivée — c'est ce qui empêche l'appui
qui ouvre un écran d'être relu par l'écran ouvert. `MenuList` est la liste d'entrées navigable, qui
boucle aux deux bouts ; `MenuGrid` est la grille de cartes, qui s'arrête aux coins, projette les
cartes qu'on lui donne et pose la classe de sélection sur la courante depuis la boucle : `TrackCard`
n'apprend pas qu'elle peut être sélectionnée. Pas de cadre d'écran commun : deux écrans se
partageaient trois règles de mise en page, un partiel SCSS (`game/_game-screen.scss`) suffisait.
Rien d'autre n'a été écrit : ni interrupteur, ni liste déroulante, ni écran d'options.

**La sortie de la course hors du lab.** `apps/web/src/app/scene/` est né, et la règle qui le protège
est dans `.dependency-cruiser.js` : ni `game/` ni `scene/` ne lisent `lab/`. Y ont déménagé
`CarScene` (réduit à l'assemblage de la voiture ; le sol peint et les obstacles du POC 1 restent au
lab), `RaceScene`, `InputPoller`, `CarDash`, `CarGauges`, plus trois nouveaux : `RaceReadout` (l'état
de course en signaux, comme `CarDash` l'est pour la voiture), `RaceHud` (les quatre coins du HUD de
course) et `DrivingPage` (ce que la vitrine et l'écran de course partagent). La plomberie 3D est
descendue de `PhysicsLab` dans une base neutre, `ScenePage` : le lab garde le compteur de
performance allumé, le panneau de debug et les caisses, le jeu n'en hérite rien. Une classe de plus
plutôt qu'un drapeau, pour que le jeu ne tienne aucune référence aux outils du développeur.

**Le jeu.** `game.routes.ts` porte trois écrans : `''` l'accueil (le titre, une seule entrée — Track
— et un lien discret vers le lab), `/tracks` le choix de piste (les boucles d'exemple que la
validation accepte, en `TrackCard` dans une `MenuGrid`, avec leur meilleur temps), et `/race/:track`
la course, chargée en `loadComponent` avec three.js et Jolt. `app.routes.ts` n'assemble plus que
`LAB_ROUTES`, `GAME_ROUTES` et un `**` qui ramène à la racine : la racine est le jeu.

**Ce qui a été tranché en chemin.** `back` en course ne quitte pas, il demande : une question
s'ouvre par-dessus, et la course continue derrière, puisque la spec 4.1 refuse la pause. Le choix de
piste liste toutes les boucles valides plutôt qu'une seule, parce qu'elles existent déjà. L'accueil
ne montre aucun bouton mort pour les modes à venir.

### 2.10 Et après

Dans l'ordre d'envie de la spec fonctionnelle 10.5, un module à la fois, chacun avec sa vitrine :
les autres pistes, le mode Collapse et son générateur, le garage, les environnements, l'éditeur.

## 3. Ce qui reste des POC

Les deux POC restent dans `poc/` tant que leur code n'a pas été repris. Quand un module a repris sa
part, la fiche du module le dit et le POC correspondant peut être supprimé. Rien du dossier `poc/`
n'est importé par le jeu, jamais.
