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
  complexité, `prefer-on-push`) et on décide règle par règle au moment du squelette.
- **La couverture n'est pas 100 % partout.** Les sous-modules `entity` visent 100 %. Les sous-modules
  `physics` et `render` s'écrivent pour être testés à travers leurs jetons (physique factice, rendu
  factice), et leur seuil est fixé par package à ce qui se teste honnêtement sans navigateur.
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

| Ordre | Module                 | Ce qu'il possède                                                      | Sa vitrine                                                                       |
|-------|------------------------|-----------------------------------------------------------------------|----------------------------------------------------------------------------------|
| 0     | squelette              | workspace, app, Makefile, qualité, route `lab/`                       | page d'accueil du lab qui liste les vitrines                                     |
| 1     | `inputs`               | actions, sources manette / clavier / tactile, fusion, palonniers      | état des entrées en direct, palonniers sur mobile                                |
| 2     | `hud/debug`            | le panneau de réglage Angular qui remplace lil-gui                    | un panneau de démonstration : dossiers, curseurs, relevés, courbes               |
| 3     | `commons` + `engine`   | EventBus, boucle à pas fixe, scènes, GameObject, rendu three, Jolt    | une scène vide avec un sol, une boîte qui tombe, le compteur d'images            |
| 4     | `camera`               | la caméra de la spec 3.9, hauteur selon la vitesse, visée             | la caméra suit un mobile factice qu'on pilote au stick                           |
| 5     | `tile`                 | `entity` du POC 2, `render` d'une tuile, `physics` de son collider    | une tuile dont on change chaque paramètre en direct, zones colorées              |
| 6     | `track`                | format de fichier, validation, générateur, assemblage, fenêtre        | le POC 2 refait : charger ou générer, caméra libre, curseur joueur               |
| 7     | `car`                  | `entity`, `render`, `physics` du POC 1, sons, traces, particules      | le POC 1 refait : la voiture sur un sol plat multi-surfaces                      |
| 8     | `game-commons`         | machine à états d'une partie, compte à rebours, chrono, résultats     | la voiture sur une piste : le POC 3 que l'on n'a jamais fait, chrono au tour     |
| 9     | `game/track`, `hud`    | mode Track, menus, HUD de course, écran de résultats, sauvegarde      | le MVP de la spec fonctionnelle 10.4, sous la route du jeu et non plus du lab    |
| 10+   | `editor`, `rally`, ... | dans l'ordre d'envie de la spec fonctionnelle 10.5                    | une vitrine par module, même règle                                               |

Les fiches qui suivent détaillent chaque étape. Elles sont écrites avant de coder et complétées
après : ce qui a été décidé en cours de route y va, puis passe dans la spec technique.

### 2.0 Squelette

Le dépôt prend la forme de hexact : `packages/`, `apps/web`, `make/`, `quality/`, `angular.json` à la
racine. L'application démarre sur une page `lab/` qui liste les vitrines disponibles ; le jeu lui-même
n'existe pas encore. Les gates tournent à vide et sont verts. La spec technique 2.6 (structure des
dossiers) s'écrit ici.

**Tranché au squelette (2026-09-12).** ESLint : `recommended` et `stylistic` typés de
typescript-eslint, sonarjs avec complexité cognitive à 20, 300 lignes par fichier et 50 par fonction
hors specs, imports de type inline, pas de chemin relatif, angular-eslint avec `prefer-on-push` et le
préfixe `hr`, et une règle propre à HexRace qui refuse tout paramètre de constructeur. Couverture :
100 % sur les packages tant qu'ils n'ont que de l'`entity`, 90 % sur l'application ; les seuils de
`physics` et `render` se fixeront quand ils existeront. Angular Material : plus tard, avec les menus.
Le rétrécissement de `make check` au diff, comme dans hexact, viendra quand la durée le justifiera.

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

### 2.2 `hud/debug`

**Ce qu'il possède.** Le panneau de réglage Angular qui remplace lil-gui, décidé dans la spec
technique (registre 2026-09-10). Des dossiers repliables, des curseurs, des cases, des listes, des
relevés en lecture seule, un éditeur de courbes comme celui du POC, persistance dans le stockage local
et export des valeurs. Il est construit tôt parce que toutes les vitrines suivantes en ont besoin.

**Sa vitrine.** Un panneau qui pilote un objet de démonstration et montre chaque type de contrôle.

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

### 2.4 `camera`

**Ce qu'il possède.** La caméra de la spec fonctionnelle 3.9 : vue du dessus qui suit l'orientation
du joueur, hauteur qui monte avec la vitesse, visée vers la prochaine tuile quand `track` existera.

**Sa vitrine.** Un mobile factice qu'on pilote au stick sur le sol de la vitrine `engine`, la caméra
qui le suit, les réglages dans le panneau debug.

### 2.5 `tile`

**Ce qu'il possède.** `entity` : le modèle du POC 2 (`poc/tile/src/model`), déjà testé, repris avec
ses tests. `render` : la géométrie 3D d'une tuile, ses zones en couleurs. `physics` : le collider
d'une tuile pour Jolt, et le revêtement sous une position locale, ce que le POC 3 devait valider.

**Sa vitrine.** Une seule tuile, chaque paramètre du modèle dans le panneau, la géométrie et le
collider qui suivent.

### 2.6 `track`

**Ce qu'il possède.** Le format de fichier acté (spec technique 3.3), la validation (5.5), le
générateur à graine, l'assemblage des tuiles en piste, la fenêtre de tuiles selon la position du
joueur.

**Sa vitrine.** Le POC 2 refait dans le vrai code : charger une piste depuis un fichier, en générer
une depuis une graine, caméra libre, curseur « position du joueur », tuiles fautives surlignées. La
carte 2D du POC 2 y revient, candidate à l'aperçu du HUD.

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

### 2.8 `game-commons`

**Ce qu'il possède.** Le tronc commun de la spec fonctionnelle 4.1 : compte à rebours, départ,
chrono, tour bouclé, fin, résultats. Une machine à états, l'EventBus pour prévenir le HUD et le son.

**Sa vitrine.** La voiture sur une piste chargée par `track`, chaque roue prenant le revêtement de sa
tuile, le chrono au tour dans le panneau. C'est le POC 3 de la spec, fait pour de vrai : il valide les
critères de la spec fonctionnelle 10.3.

### 2.9 `game/track` et le `hud`

**Ce qu'il possède.** Le mode Track, les menus, le HUD de course, l'écran de résultats, la sauvegarde
locale du meilleur temps. Première route qui n'est pas une vitrine : le jeu.

**Fini quand** le MVP de la spec fonctionnelle 10.4 se joue de bout en bout, à la manette et au
tactile.

### 2.10 Et après

Dans l'ordre d'envie de la spec fonctionnelle 10.5, un module à la fois, chacun avec sa vitrine :
les autres pistes, le mode Collapse et son générateur, le garage, les environnements, l'éditeur.

## 3. Ce qui reste des POC

Les deux POC restent dans `poc/` tant que leur code n'a pas été repris. Quand un module a repris sa
part, la fiche du module le dit et le POC correspondant peut être supprimé. Rien du dossier `poc/`
n'est importé par le jeu, jamais.
