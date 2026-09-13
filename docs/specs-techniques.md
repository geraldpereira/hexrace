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

- **La physique** : l'intégration de Jolt, le corps véhicule sous contrainte, la boucle à pas fixe avec accumulateur (`engine/gameLoop.ts`), et le système GameObject / Component (`engine/gameObject.ts`, `engine/components.ts`) qui assemble maillage et corps physique.
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

**Le mot est « tile ».** On n'emploie pas « hex » dans le code : en anglais, *hex* est aussi une malédiction.

Briques techniques :

| Package  | Ce qu'il possède                                                                                                         |
|----------|--------------------------------------------------------------------------------------------------------------------------|
| `inputs` | L'interface d'entrées et ses trois implémentations : manette, clavier, tactile. Repris de rally-game.                    |
| `camera` | La caméra qui suit le joueur, dont la hauteur suit la vitesse et qui s'oriente vers la prochaine tuile [F 3.9].          |
| `hud`    | **Le seul package avec des composants Angular.** Sous-modules : `commons`, `menus`, `game`, `editor`, `dialog`, `debug`. |

Briques fonctionnelles :

| Package  | Ce qu'il possède                                                                                                                                      |
|----------|-------------------------------------------------------------------------------------------------------------------------------------------------------|
| `tile`   | Une tuile : son modèle de données, son modèle physique et son modèle 3D.                                                                              |
| `car`    | Une voiture : modèle de données (type, améliorations), affichage, modèle physique.                                                                    |
| `track`  | L'assemblage de tuiles en piste, le format de fichier, l'affichage et le masquage des tuiles selon la position et le rythme du joueur [F 9.2, F 4.4]. |
| `editor` | L'assemblage d'une piste à la main [F 5.2].                                                                                                           |
| `game`   | Un module par mode (`track`, `rally`, `collapse`) et un module `game-commons` pour le tronc commun [F 4.1].                                           |

**Sous-modules.** `tile` et `car` mêlent modèle de données, physique et 3D. Comme dans hexact, où un package est fait de dossiers sous `src/` exposés par un seul `index.ts`, chacun se découpe en trois sous-modules :

- `entity` : les modèles de données, sans dépendance vers Jolt ni three.js, testables seuls ;
- `physics` : le modèle physique, lit `entity` ;
- `render` : le modèle 3D, lit `entity`.

`physics` et `render` ne se lisent pas l'un l'autre : ce qu'ils ont à se dire passe par `entity`. La règle est tenue par dependency-cruiser (2.2).
On peut voir a faire en sorte que chaque module puisse être testé dans le navigateur avec une petite appli de test: car affichera une voiture on fonction de son data model, tiles idem, etc 

### 2.2 Assemblage, dépendances et injection

**Des scènes, comme Unity et Godot.** On reprend le système GameObject / Component de rally-game et on le complète d'une notion de scène : une scène assemble les composants d'un écran (la course, l'éditeur, le garage). Changer d'écran, c'est décharger une scène et charger la suivante.

**Des interfaces, des implémentations injectées.** Chaque package expose des interfaces et des jetons ; les implémentations sont fournies de l'extérieur. C'est ce qui rend les tests faciles : une physique factice, des entrées scriptées.

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

*Domaine / physique / rendu / entrées / interface : où passe la donnée, qui possède la vérité sur la position de la voiture.*

### 2.4 Boucle de jeu

Pas fixe pour la physique, rendu à la fréquence de l'écran, interpolation entre deux pas : la boucle à accumulateur de rally-game, avec sa borne sur le temps rattrapé par image.

**Perte de focus.** Il n'y a pas de pause [F 4.1], donc perdre le focus ne suspend pas la partie. Le navigateur arrête les images d'un onglet caché ; au retour, on ne simule pas la physique manquante (la voiture reste où elle était) mais on **applique le temps écoulé** : le chrono avance de la durée réelle, et en Collapse le front de disparition avance d'autant, ce qui mènera vite à la défaite. C'est voulu.

### 2.5 État de partie et modes

*Machine à états du tronc commun [F 4.1] et de chaque mode. Où vit le chrono, qui déclare la fin.*

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
  *Tile, Profile, Face, Track, Environment : les types TypeScript qui portent [F 2.1] à [F 2.6], et leurs invariants.*
- 3.2 Coordonnées et placement
  *Grille hexagonale côté plat vers l'avant, faces en heures d'horloge, comment une liste de tuiles devient des positions et des orientations dans le monde.*
- 3.3 Format de fichier de piste
  *Grammaire exacte du fichier texte [F 5.4], versionnage de l'en-tête, parser et sérialiseur, messages d'erreur.*

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
- 3.4 Validation
  *Implémentation des règles [F 2.6] et [F 5.5] : jonctions, départ et arrivée, auto-intersection, fermeture en Track. Où elle s'exécute (éditeur, générateur, chargement).*
- 3.5 Géométrie d'une tuile
  *Comment on construit le maillage d'une tuile depuis ses paramètres : piste, bas-côtés, paysage, transition au milieu, pente. Partage des sommets aux jonctions.*
  *Réglé dans le POC 2 : la hauteur est une cubique de Hermite par tuile dont les pentes aux faces sont déduites des tuiles voisines (méthode de Steffen) ; les deux tuiles d'une jonction calculent la même pente, donc pas d'arête, et une tuile plate qui suit une pente reste plate.*
- 3.6 Obstacles
  *Modèle de données (emprise en unités le long de la piste), modèle physique, modèle visuel, et comment l'environnement les habille [F 2.4].*
- 3.7 Environnements et surfaces
  *Comment une palette d'environnement associe un type de piste à des paramètres de friction et à un matériau de rendu [F 2.2].*
- 3.8 Générateur procédural
  *Graine et cadrans dans une chaîne, PRNG déterministe, génération tuile par tuile [F 5.3]. Ce qu'on reprend de la forge de hexact.*
- 3.9 Fenêtre de tuiles
  *Chargement et déchargement des tuiles autour du joueur [F 9.2], et le front de disparition de Collapse [F 4.4] par-dessus.*

---

## 4. Véhicule et physique

### 4.1 Modèle du véhicule

Le **contrôleur véhicule de Jolt** (`WheeledVehicleController` sous `VehicleConstraint`), comme rally-game utilisait son `MotorcycleController`. Écrire une voiture à raycasts maison serait trop pour un petit jeu d'arcade : suspensions, friction et transfert de masse seraient à refaire.

Ce contrôleur fait lui-même **un lancer par roue** à chaque pas (rally-game utilisait `VehicleCollisionTesterCastCylinder`) : chaque roue connaît le corps qu'elle touche et le point de contact. On a donc le contact par roue sans l'écrire.

<TODO> Masse, centre de gravité, ce qui est simulé et ce qui est triché pour le ressenti [F 3.2].

### 4.2 Surfaces et friction

Grâce au contact par roue fourni par le contrôleur (4.1), **chaque roue connaît sa surface**. À partir du point de contact, on retrouve la tuile et, en coordonnées locales de la tuile, la zone (piste, bas-côté, paysage) et donc le type de surface ; c'est un calcul pur sur le modèle de données, sans découper le maillage physique par zone. Les paramètres de friction longitudinale et latérale de la roue sont mis à jour à chaque pas selon la surface trouvée.

<TODO> Table type de surface vers paramètres de friction [F 3.4], et comment on lisse le passage d'une zone à l'autre.

- 4.3 Glisse, frein à main, tête-à-queue
  *Comment on obtient le comportement voulu [F 3.5] : courbes de friction, aides invisibles, marche arrière au frein maintenu.*
- 4.4 Suspensions
  *Paramètres, ce qu'elles doivent faire sentir [F 3.2], comportement aux atterrissages.*
- 4.5 Sauts
  *Décollage sur rampe, contrôle en vol nul ou léger [F 3.6], détection de retournement.*
- 4.6 Collisions et dégâts
  *Couches de collision, détection de l'impact par partie de voiture, modèle de dégâts et application à la conduite [F 3.7].*
- 4.7 Reset et respawn
  *Dernière tuile parcourue, remise à l'arrêt, sortie du terrain [F 3.8].*
- 4.8 Déterminisme
  *Ce qu'on garantit (même entrée, même course) et ce qu'on ne garantit pas. Conséquences pour le défi quotidien.*
- 4.9 Réglage
  *Panneau de réglage dans le sous-module `debug` du HUD, sauvegarde des valeurs, comment un réglage passe de l'outil au code.*

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
livrent des valeurs continues ; c'est le module des menus qui détectera les fronts.

---

## 6. Rendu

- 6.1 Scène et caméra
  *Organisation de la scène, caméra du dessus dont la hauteur suit la vitesse [F 3.9], lumière d'ambiance [F 8.4].*
- 6.2 Style
  *Flat shading ou textures pixelisées, post-traitement [F 8.1], résolution de rendu réduite sur mobile.*
- 6.3 Matériaux et lisibilité
  *Un matériau par type de surface et par environnement [F 8.2], comment on les fabrique et les nomme.*
- 6.4 Effets
  *Particules, traces de pneus, déformation de la voiture [F 8.3] : technique de chacun et coût.*
- 6.5 Modèles 3D
  *Voitures et obstacles : format, pipeline depuis Blender, conventions de nommage et d'échelle (une unité = une largeur de voiture).*
- 6.6 Budget de performance
  *Polygones, appels de rendu, textures, mémoire ; comment on mesure sur mobile et ce qu'on coupe en premier [F 9.2].*

---

## 7. Audio

### 7.1 Bibliothèque

Rien n'existe dans rally-game : Howler et Tone y sont installés, aucun son n'a été écrit. Le choix est donc ouvert.

<CHOIX> **Howler** (lecture d'échantillons, sprites audio, gestion du déblocage mobile, léger), **Tone** (synthèse et séquencement, plus lourd, utile si le moteur est synthétisé), ou **Web Audio nu** (aucune dépendance, tout à écrire). Le choix dépend de 7.2 : si le son moteur est fait d'échantillons, Howler suffit ; s'il est synthétisé, Web Audio nu ou Tone.

- 7.2 Moteur
  *Son dépendant du régime, rupteur, claquements d'échappement [F 8.5] : échantillons ou synthèse.*
- 7.3 Roulement, glisse, collisions, interface
  *Sources, déclencheurs, mixage.*
- 7.4 Contraintes navigateur
  *Déblocage du contexte audio au premier geste, comportement en arrière-plan, mobile.*

---

## 8. Écrans et interface

**Bibliothèque de composants : Angular Material, et les icônes Material Symbols** (décidé le
2026-09-13). Tout ce qui est générique dans l'inventaire de [F 7.5] est pris tel quel ; le package
`hud` n'écrit que les composants propres au jeu, répartis dans ses sous-modules : `commons` (conteneur
de canvas, barres, cartes, solde), `game` (compte-tours, rapport, vitesse, dégâts, chrono, compte à
rebours, aperçu, jauge de reset, faux sens, témoins, palonniers), `menus`, `dialog` (résultats),
`editor`, `debug` (l'enveloppe Angular de lil-gui avec les ajouts du POC, et le compteur de
performance ; voir la décision du 2026-09-13).

- 8.1 Structure applicative
  *Routage des écrans [F 7.1], cohabitation d'un canvas three.js persistant avec les vues, cycle de vie des scènes (2.2).*
- 8.2 HUD
  *En DOM par-dessus le canvas ou dans la scène ; fréquence de rafraîchissement ; l'indicateur du front de disparition [F 7.2]. Ce qui bouge à chaque image se met à jour hors de la détection de changement, par signaux ou écriture directe du DOM depuis la boucle.*
- 8.6 Panneau de debug (écrit le 2026-09-13, référence `packages/hud/src/debug`)
  lil-gui derrière le service `DebugPanel` : un module appelle `register(titre, build, destroyRef)` et construit son dossier dans `build` ; le service restaure les valeurs du dossier depuis `localStorage` (clé `hexrace.debug.<titre>`, sans les relevés ni les boutons), les sauve à chaque `onFinishChange`, ajoute un bouton de reset et détruit le dossier avec son propriétaire. La racine porte le dossier Performance (`PerfMeter`, alimenté par la boucle ; le moteur y écrira la durée du pas), l'export JSON des valeurs (courantes contre initiales, via `controller.initialValue`) et le reset général. Deux rangées maison : `addCurveEditor` (le POC voiture) et `addPlot` (tracé glissant). Bascule par la touche `\``. Le panneau est créé à la demande : un jeu livré qui ne l'appelle pas ne le charge pas.
  L'indicateur de performance en coin d'écran est le composant `PerfCorner`, monté dans l'application et affiché quand `PerfMeter.cornerVisible` est vrai.
- 8.7 Composants du HUD (écrit le 2026-09-13, référence `packages/hud/src/game`, `commons`, `dialog`)
  Chaque composant est `OnPush` et une fonction de ses entrées `input()`, sans dépendance vers `car`, `track` ou `game` : ce sont eux qui le nourriront. Les contrats d'affichage vivent dans le `hud` : `DamageReadout` (douze éléments, 100 intact à 0 cassé), `TimerReadout` (mode, temps courant, tour, meilleur, écart, temps de passage), `AssistReadout`, `TrackSummary`, `CarSummary`, `RaceResult`. Ce qui se rejoue (flash du rapport, pulsation du dégât, chute du compte à rebours) est une Web Animation lancée depuis un `effect`, pas une recréation d'élément. Le conteneur de canvas adopte le canvas qu'on lui donne et publie sa taille par `ResizeObserver` ; le renderer s'y ajustera. La boîte de résultats est un `MatDialog` ouvert par le service `ResultsDialogs`, qui rend `'retry'` ou `'home'`. Thème : `mat.theme` sombre dans `apps/web/src/styles.scss` ; icônes `material-symbols` servies en local et déclarées police par défaut de `MatIconRegistry` au démarrage.
  Les couleurs sont des variables CSS globales posées dans `apps/web/src/styles.scss` (`--hr-accent`, `--hr-danger`, `--hr-ok`, `--hr-text`, `--hr-surface`, `--hr-track`, `--hr-card`, `--hr-glass`…) ; chaque composant les lit avec un repli sur la même valeur, pour rester correct hors de l'application.
  Le `hud` se teste par le builder Angular (`ng test hud`, projet `hud` de `angular.json` pointant sur le build de l'application) : le JIT brut de Vitest ne voit pas les entrées par signal.
- 8.3 Éditeur
  *Architecture de l'éditeur [F 5.2], réutilisation du rendu de piste, interactions clavier et souris, sauvegarde.*
- 8.4 Garage
  *Données des voitures et améliorations [F 3.1], comment elles sont décrites et chargées.*
- 8.5 Textes
  *Anglais uniquement [F 9.4], mais un seul endroit pour toutes les chaînes.*

---

## 9. Persistance

### 9.1 Stockage local

Schéma des données sauvegardées [F 6.4] dans le stockage local du navigateur, avec un numéro de version dans la clé ou le document.

**Aucune migration** à écrire tant que le jeu n'est pas déployé sur `hexrace.delper.software` : avant cela, un changement de schéma efface simplement les données locales.

- 9.2 Pistes éditées
  *Stockage des fichiers de piste dans le navigateur, listing, suppression.*
- 9.3 Évolution vers un serveur
  *Ce qu'il faudra pour une sauvegarde distante et le défi quotidien ; ce qu'on prépare aujourd'hui sans le construire.*

---

## 10. Qualité et tests

- 10.1 Tests unitaires
  *Sur les services sans DOM, three.js ni Jolt : parser, validation, placement, générateur, machine à états. Vitest avec TestBed, couverture visée.*
- 10.2 Tests de conduite
  *Scénarios physiques reproductibles (une épingle au frein à main, un saut) qui vérifient le ressenti sans humain.*
- 10.3 Tests de bout en bout
  *Ce qu'on vérifie dans un vrai navigateur, sur quels écrans.*
- 10.4 Portes de qualité
  *Lint, dépendances, duplication, code mort, couverture : ce qu'on reprend de hexact et à quel seuil.*
- 10.5 Commandes
  *Le Makefile : une cible par geste, la liste tient sur un écran.*
- 10.6 Outils de debug
  *Le sous-module `debug` du HUD : compteur d'images, panneau de réglage, affichage des formes physiques, téléportation, rejouer une graine.*

---

## 11. Build et déploiement

- 11.1 Build de production
  *Taille du bundle, découpage, chargement des assets et du wasm, cache.*
- 11.2 Hébergement
  *Site statique sur `hexrace.delper.software` ; Cloudflare comme hexact.*
- 11.3 Hors ligne
  *Application installable, service worker, ce qui est mis en cache [F 9.3].*
- 11.4 Mobile
  *Navigateur d'abord ; ce qu'un portage en application demanderait plus tard [F 1.4].*
- 11.5 Compatibilité
  *Navigateurs et versions supportés, détection des prérequis (WebGL2, wasm), message quand ils manquent.*

---

## 12. Plan des POC

- 12.1 POC 1 : voiture et surfaces
  *Ce qu'on construit techniquement pour [F 10.1], dans quel ordre, et ce qui est jetable.*
- 12.2 POC 2 : tuiles et pistes
  *Idem pour [F 10.2] : types, placement, géométrie, parser, validation, générateur, fenêtre de tuiles. Terrain seul, sans Jolt. La carte 2D du POC (canvas, balayage des zones et des obstacles) est candidate à passer telle quelle dans `hud` pour l'aperçu des tuiles suivantes [F 7.2].*
- 12.3 POC 3 : la voiture sur les tuiles
  *Idem pour [F 10.3] : surface par roue depuis les coordonnées locales de la tuile, collider de tuile, fenêtre de tuiles en mouvement.*
- 12.4 Du POC au MVP
  *Ce qui passe tel quel, ce qui est réécrit, ce qui est jeté.*
  **Décidé le 2026-09-12 : on ne fait pas le POC 3 à part, on commence le jeu.** La construction se
  fait module par module, du plus bas niveau au jeu fini, chaque module jouable seul dans une
  « vitrine » sous la route `lab/<module>` de l'application ; le POC 3 devient la vitrine du tronc
  commun de jeu. Le détail, l'ordre et les fiches par module sont dans le
  [plan de construction](plan-de-construction.md).

---

## 13. Décisions et questions ouvertes

### 13.1 Registre des décisions

| Date | Décision | Raison |
|---|---|---|
| 2026-09-10 | three.js avec WebGLRenderer, WebGL2 | Partout, intégration Jolt déjà écrite, WebGPU sans gain pour du low poly |
| 2026-09-10 | Jolt Physics, contrôleur véhicule à roues | Éprouvé (Godot 4.4), contact par roue fourni, repris de rally-game |
| 2026-09-10 | Angular partout : services `providedIn: 'root'` dans tous les packages, composants dans le seul `hud` | Tant qu'on a Angular, on l'utilise jusqu'au bout |
| 2026-09-10 | Toolchain et chaîne qualité de hexact | Déjà rodées |
| 2026-09-10 | Le mot est « tile », jamais « hex » | En anglais, *hex* est aussi une malédiction |
| 2026-09-10 | Sous-modules `entity` / `physics` / `render` dans `tile` et `car` | Comme hexact ; le modèle se teste sans Jolt ni three.js |
| 2026-09-10 | Injection de dépendances Angular partout, jetons pour les interfaces, injecteur enfant par scène | Le code de rally-game sans DI ne plaisait pas ; testabilité |
| 2026-09-10 | Scènes à la Unity / Godot sur le GameObject / Component de rally-game | Assembler les composants d'un écran |
| 2026-09-10 | EventBus pour le transverse | Éviter les dépendances croisées |
| 2026-09-10 | ~~Debug via le HUD Angular, pas lil-gui~~ (annulée le 2026-09-13) | Un seul outillage d'interface |
| 2026-09-10 | Perte de focus : pas de pause, temps écoulé appliqué au retour | Cohérent avec [F 4.1] |
| 2026-09-10 | Pas de migration de stockage avant le déploiement | Rien à préserver avant |
| 2026-09-12 | Grammaire du fichier de piste : celle du POC 2 (3.3) | Lisible à la main, une ligne par tuile, obstacles en clair, relecture à l'identique |
| 2026-09-12 | Pas de POC 3 séparé : le jeu se construit module par module, chaque module jouable seul dans une vitrine `lab/<module>` (12.4, [plan](plan-de-construction.md)) | Un banc de réglage durable par module ; l'assemblage des vitrines est le jeu |
| 2026-09-12 | Pas de constructeur à paramètres : `inject()` partout, tests par `TestBed` avec des jetons remplacés | Ne pas se casser la tête à monter des graphes d'objets à la main dans les tests |
| 2026-09-12 | Règles ESLint maison de hexact non reprises telles quelles ; couverture à 100 % pour `entity` seulement, seuil par package pour `physics` et `render` | La DI partout et la 3D changent ce qui se teste honnêtement sans navigateur |
| 2026-09-12 | Deux packages de plus que 2.1 : `commons` (vocabulaire, EventBus, RNG) et `engine` (boucle, scènes, GameObject, services three et Jolt) | La spec les sous-entendait sans les nommer |
| 2026-09-12 | Code, commentaires et tests en anglais ; docs et commits en français ; règle `comment-ration` de hexact reprise | Demande de Gérald ; un commentaire rationné par ce qu'il documente |
| 2026-09-13 | Angular Material pour les composants génériques, Material Symbols pour les icônes ; `hud` n'écrit que le propre au jeu ([F 7.5]) | On ne refait pas un menu ni une boîte de dialogue |
| 2026-09-13 | Panneau de debug : lil-gui repris avec les ajouts du POC voiture, dans `hud/debug` ; annule la décision du 2026-09-10 | Jamais visible du joueur, pas la peine de le redévelopper en Angular |
| 2026-09-13 | Dégâts : un pourcentage par élément (100 intact, 0 cassé), effets proportionnels ([F 3.7, F 7.5]) | Plus fin que trois états, et directement lisible |

### 13.2 Questions ouvertes

| Réf. | Question |
|---|---|
| 7.1 | Howler, Tone ou Web Audio nu, selon que le moteur est échantillonné ou synthétisé |

---

## Annexes

- A. Glossaire technique
  *Pas fixe, profil, fenêtre de tuiles, graine, couche de collision, scène, racine de composition... un mot, une définition.*
- B. Schémas
  *Découpage des packages et dépendances, boucle de jeu, flux d'une entrée jusqu'au rendu, fenêtre de tuiles. Dans une page HTML à côté, comme les croquis fonctionnels.*
