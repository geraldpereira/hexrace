# HexRace - Spécifications fonctionnelles

> Jeu de rallye 3D arcade, low poly, jouable dans le navigateur, dont les pistes sont assemblées à partir de tuiles hexagonales paramétrées.

Ce document dit ce que le jeu **est** pour le joueur. Il ne dit rien de la manière de le construire : cela relève des spécifications techniques (`docs/specs-techniques.md`, à venir).

## Comment utiliser ce document

Ce qui est écrit en clair est décidé. Trois balises servent pendant la rédaction :

- **`<TODO>`** : c'est décidé, il reste à l'écrire ou à le préciser.
- **`<CHOIX>`** : ce n'est pas décidé, les options sont posées à la suite, il faut trancher avant de coder.
- **`<GPE>`** : une réponse de Gérald laissée dans le fichier entre deux passages, fondue ensuite dans le texte.

Toutes les `<CHOIX>` sont rassemblées en 11.2.

---

## 1. Vision

### 1.1 Pitch en une phrase

Un jeu de rallye vu du dessus où l'on enchaîne des virages en glisse sur des pistes faites d'hexagones, en moins de cinq minutes par partie, sur PC ou sur téléphone, dans le navigateur.

### 1.2 Piliers de conception

Trois principes départagent une décision quand on hésite :

1. **Le fun avant le réalisme.** Si une règle physique rend la conduite moins agréable, on la tord.
2. **Visuellement simple.** Low poly, peu d'éléments à l'écran, tout ce qui est affiché sert à conduire.
3. **Des parties courtes.** Cinq minutes grand maximum, quel que soit le mode. Une piste ou un mode qui déborde est raccourci.

### 1.3 Références et inspirations

- **Super Woden: Rally Edge** (ViJuDa, 2026) pour le ressenti : rallye arcade vu du dessus, glisse généreuse, plaisir immédiat. On lui emprunte aussi le garage où l'on achète, améliore et personnalise ses voitures.
- **Wreckfest** pour les dégâts : ce qui est abîmé se voit sur la voiture et se ressent dans la conduite.

Ce qu'on ne leur emprunte pas : la profondeur de simulation, les réglages fins, les courses longues.

### 1.4 Public et format de session

- **Appareil** : navigateur, sur PC et sur mobile. Le jeu doit tourner directement dans le navigateur mobile ; si ce n'est pas tenable, un portage viendra plus tard.
- **Session** : une partie complète en moins de cinq minutes, lancée et terminée sans engagement. Sur mobile, la référence est **une partie entre deux arrêts de métro ou de bus** : lancement immédiat, pas de menu à traverser, pas de sauvegarde à gérer.
- **Public** : joueur occasionnel qui aime les jeux de conduite arcade, à la manette de préférence.

### 1.5 Hors périmètre

- Pas de simulation poussée : pas de réglages de suspension, de transmission ou de pneus exposés au joueur.
- Pas de multijoueur dans un premier temps (voir 4.6).
- Pas de météo, pas de cycle jour/nuit, pas de décor hors des tuiles.
- Pas de musique.

---

## 2. Le terrain hexagonal

### 2.1 L'hexagone comme unité de base

Un **hexagone** (ou **tuile**) est l'unité de construction d'une piste. Il est défini par ses paramètres, jamais dessiné à la main : c'est ce qui permet de générer des pistes procéduralement et d'assurer que deux tuiles se raccordent.

**L'unité de mesure est la largeur d'une voie**, soit **3 m**. Tout ce qui suit se compte en unités. Une voiture fait 1,6 m de large : l'unité n'est pas sa largeur mais la voie où elle roule, marges comprises, et la plupart des virages se prennent en glisse, ce qui demande bien plus que la largeur de la caisse. Une piste de 3 unités laisse donc de quoi déborder de sa trajectoire, et un obstacle d'une unité de large a la taille d'un vrai obstacle.

- **Orientation** : **côté plat vers l'avant**. Une tuile a donc une face devant, une face derrière, et deux faces de chaque côté.
- **Échelle** : un côté d'hexagone mesure **8 unités**. Cette largeur laisse de la marge pour qu'une légère sortie sur le bas-côté au passage d'une tuile à l'autre ne fasse pas tomber le joueur du terrain.
- **Traversée** : la piste entre par une face et sort par une autre. Selon la face de sortie par rapport à la face d'entrée, la tuile est une ligne droite (face opposée), un virage large (60°) ou un virage serré (120°). On ne sort jamais par la face d'entrée.
- **Profil sur une face** : de gauche à droite, du paysage, éventuellement un bas-côté, la piste, éventuellement un bas-côté, du paysage.
  - la **piste** fait de **1 à 5 unités** ;
  - chaque **bas-côté** fait **0 ou 1 unité** ;
  - piste plus bas-côtés font **6 unités au plus**, de sorte qu'il reste **au moins 1 unité de paysage de chaque côté**. Une piste de 5 unités n'a donc qu'un bas-côté au plus ;
  - la **position** du bloc piste plus bas-côtés sur la face se donne en unités depuis la gauche.
- **Variation dans la tuile** : largeur, position et types peuvent différer entre l'entrée et la sortie. La piste se resserre, s'élargit ou se décale dans la tuile, le long de son axe, sur une **étendue de transition** fixée par l'environnement (voir 2.2) ; aux faces, le profil est exactement celui écrit. Une piste étroite peut entrer à gauche d'une face et sortir à droite d'une autre.
- **Hauteur** : chaque tuile porte une hauteur d'entrée et une hauteur de sortie, entières, en **pas de 20 cm**, de 0 à 1000 (voir 2.3 pour l'amplitude et les pentes). Leur différence est la **déclivité** de la tuile, positive, négative ou nulle. Contrairement aux longueurs, la hauteur se compte en mètres et non en unités : le relief d'une piste ne bouge pas si l'unité change.
- **Obstacles** : une tuile peut porter des obstacles le long de la piste (voir 2.4).

**Nommage des faces.** Les six faces sont nommées par les **heures d'une horloge** : avec le côté plat vers l'avant, la face de devant est 12, celle de derrière 6, et les quatre faces latérales 2, 4, 8 et 10. Dans le fichier de piste, l'entrée d'une tuile est toujours la face 6 par convention (on vient de derrière), et seule la face de sortie est écrite : 12 pour une droite, 10 ou 2 pour un virage à 60°, 8 ou 4 pour un virage à 120°. L'orientation absolue d'une tuile se déduit de celle de la précédente.

Les heures s'écrivent en deux caractères et se manipulent comme des nombres : un virage à 60° est un écart de 2, la face opposée un écart de 6. C'est ce qui les fait préférer aux points cardinaux.

### 2.2 Catalogue des surfaces

Une piste appartient à un **environnement**, et un niveau reste dans un seul environnement du début à la fin. L'environnement fixe l'apparence des tuiles, la palette de surfaces disponibles et l'habillage des obstacles.

Environnements prévus :

- **Pays du Nord** : neige, glace.
- **France / Europe** : routes bitumées en plus ou moins bon état.
- **Afrique** : terre, gravier.
- D'autres pourront suivre sur le même modèle.

Chaque environnement offre exactement :

- **3 types de piste**,
- **3 types de bas-côté**,
- **2 types de paysage**, dont éventuellement un paysage **bloquant** (une forêt, par exemple) que la voiture ne peut pas traverser.

Une tuile porte un type de piste, un type de bas-côté et un type de paysage, chacun pris dans la palette de son environnement. Ces types déterminent l'adhérence et la rugosité de chaque zone.

Une tuile est **transposable** d'un environnement à l'autre : sa géométrie ne change pas, seuls changent les grips et l'apparence. Le type « piste 2 » d'Europe et le type « piste 2 » d'Afrique sont des revêtements différents à la même place dans la palette. Une piste dessinée en Europe se joue donc en Afrique sans être redessinée.

**Noms génériques.** Comme les obstacles (voir 2.4), les surfaces ne sont **jamais nommées par leur matière** dans les données, le code ou les fichiers de piste : pas d'asphalte, de gravier ni de glace, mais un **rang dans la palette**, piste 1 à 3, bas-côté 1 à 3, paysage 1 à 2. Pour que la transposition garde un sens, les rangs sont **ordonnés par adhérence décroissante** : la piste 1 est la plus adhérente de son environnement, la piste 3 la plus glissante ; de même pour les bas-côtés. Le paysage 2 est celui qui peut être bloquant. « Asphalte » ou « neige » ne sont que les habillages que l'environnement donne à ces rangs.

**Ce qu'un environnement définit** :

- pour chacun de ses huit types de surface : adhérence longitudinale et latérale, freinage, effet sur la vitesse de pointe, grain, et l'apparence (voir 3.4 et 8.2) ;
- l'**étendue de la transition** dans une tuile (voir 2.6) : la fraction de l'axe sur laquelle largeur, position et types passent du profil d'entrée au profil de sortie. La hauteur ne dépend pas de ce réglage, elle suit la courbe de 2.3. Le POC 2 montre qu'une transition sur toute la tuile donne des courbes régulières là où une transition sur la bande centrale fait des chicanes ; la valeur par environnement se règle en roulant ;
- l'habillage de chaque obstacle (voir 2.4).

<TODO> Lister les trois pistes, trois bas-côtés et deux paysages de chaque environnement, et pour chacun ce que le joueur doit ressentir. Le POC 1 sert précisément à trouver ces valeurs.

### 2.3 Relief

Le relief se joue uniquement par la hauteur des tuiles et les obstacles.

- Deux tuiles consécutives se raccordent à la même hauteur (voir 2.6). Le long de la piste, la hauteur suit une **courbe lisse qui passe par la hauteur de chaque face** ; la pente à une face n'est pas écrite dans les données, elle se **déduit des deux tuiles qui s'y touchent** (spline cubique monotone). Ainsi une montée d'une unité par tuile sur plusieurs tuiles est une rampe rectiligne et non une suite de paliers, une tuile plate reste plate, la pente est nulle là où la piste change de sens de pente et aux deux bouts d'une piste ouverte, et il n'y a jamais d'arête à une jonction puisque les deux tuiles calculent la même pente.
- Les sauts se font sur des **rampes** et des **dos d'âne** posés comme obstacles sur la piste, pas par le relief des tuiles.
- La hauteur n'est fixée que sur les faces d'entrée et de sortie. Deux tuiles qui se touchent par une face latérale sans y être reliées par la piste peuvent y avoir des hauteurs différentes : il en résulte une **marche dans le paysage**, acceptée comme relief. Une marche n'est jamais admise **sur la piste ni sur les bas-côtés**, ce que garantit déjà la règle d'assemblage 2.6.

**Pentes et amplitude.**

- La **pente maximale d'une tuile** dépend de sa sortie, parce qu'en virage le bord intérieur de la piste parcourt moins de distance que l'axe pour la même montée et se trouve donc plus raide : **25 %** en ligne droite, **18 %** en virage large, **12 %** en virage serré, mesurés le long de l'axe de la tuile. Avec l'unité à 3 m, cela fait au plus 51 pas de hauteur sur une ligne droite (axe de 13,9 unités, soit 41,6 m), 33 en virage large (12,6 unités, 37,7 m) et 15 en virage serré (8,4 unités, 25,1 m).
- L'**amplitude** d'une piste, du point le plus bas au plus haut, est au plus de **200 m**, soit 1000 pas.
- Le **départ et l'arrivée ne sont pas nécessairement à l'altitude 0** : une piste peut commencer à mi-hauteur, monter puis descendre sous son point de départ, tant que l'amplitude tient dans les 200 m.
- Le **générateur** reste plus prudent que la main : il se limite aux **trois quarts** de ces seuils, soit 18,75 % en ligne droite, 13,5 % en virage large et 9 % en virage serré, où la marche entre les deux tuiles voisines se concentre au sommet — au plus 38, 25 et 11 pas. Une piste faite à la main va jusqu'aux seuils pleins.

Les seuils et l'unité de 3 m sont calés en roulant sur des pistes générées, avec la voiture du POC 1 (1,6 m de large) : 20 / 15 / 10 % donnaient des pistes trop sages, la glisse en virage demande la voie large.

### 2.4 Habillage d'une tuile

Un obstacle est un **bloc** qui occupe **X unités de large** dans le modèle de données de la tuile, placé **le long du tracé de la piste**. Son modèle physique peut être plus petit que son emprise dans les données : une rambarde est plus étroite qu'un talus de neige, mais les deux réservent la même place.

| Élément   | Où                                                   | Hauteur | Effet                                                      |
| --------- | ---------------------------------------------------- | ------- | ---------------------------------------------------------- |
| Barrière  | Contre le bord de piste, sur l'unité qui le borde   | 1 m     | Bloque, collision avec dégâts                              |
| Rampe     | Sur la piste                                         | 0,8 m   | Fait décoller                                              |
| Dos d'âne | Sur la piste                                         | 0,3 m   | Fait sauter légèrement, déstabilise à haute vitesse        |
| Hazard    | Sur la piste ou le bas-côté                          | 1,5 m   | Obstacle à éviter, collision avec dégâts                   |
| Plaque    | Sur la piste                                         | à plat  | Zone d'un autre revêtement, change le grip, sans collision |

**Les hauteurs sont en mètres, pas en unités** : une barrière doit arriver à hauteur de portière et un hazard masquer la vue, quelle que soit la largeur d'une voie.

Exemples de hazards : balle de foin, véhicule en panne, rocher, tas de troncs. Exemples de plaques : flaque de boue sur une piste en gravier, plaque de glace sur une piste en neige, gravillons sur une piste en asphalte. La plaque prend son revêtement dans la palette de l'environnement (voir 2.2), c'est un piège de grip là où on ne l'attend pas. L'environnement décide de l'apparence de chaque élément : une barrière est une rambarde en Europe, un talus de neige dans le Nord.

**Emprise d'un obstacle.** Un obstacle se pose **par rapport à la piste**, pas par rapport à la face :

- **le long de la piste**, par une **fraction de l'axe de la tuile**, 0 à la face d'entrée, 1 à la face de sortie. La longueur de l'axe dépend de la sortie (13,9 unités en ligne droite, 12,6 en virage à 60°, 8,4 en virage à 120°) ; la fraction, elle, ne change pas : une barrière tout le long s'écrit toujours de 0 à 1, et une tuile dont on change la sortie garde ses obstacles en place ;
- **en travers**, par un **décalage en unités depuis le centre de la piste**, négatif à gauche. Quand la piste se déplace dans la tuile, l'obstacle la suit.

Deux familles :

- les **hazards**, objets rigides posés à une fraction et un décalage, orientés le long de la piste. Ils n'ont pas de nom dans les données mais une **taille** : _small_ (1 × 1 unité), _medium_ (2 unités le long, 1 en travers), _large_ (2 × 2). L'environnement décide de l'aspect : une balle de foin, un rocher ou une épave sont trois habillages d'un même hazard ;
- les **objets suivis**, qui épousent la courbe de la piste entre deux fractions : la barrière (sur l'unité qui borde la piste du côté choisi, qu'il y ait un bas-côté ou non ; le mur lui-même se dresse **contre le bord de la piste**, à l'entrée de cette unité, et ce qu'elle réserve derrière est du décor : on frotte la barrière, pas un muret perdu au milieu du bas-côté ; elle ne contraint pas le profil, ce qui garde les jonctions simples entre une tuile avec barrière et une sans), la rampe et le dos d'âne (toute la largeur de la piste), la plaque (un décalage, une largeur et un revêtement).

**Le relief d'un objet suivi.** La rampe et le dos d'âne sont des volumes, pas des marquages :

- la **rampe** est un plan incliné : son dessus part du sol au début de son emprise et monte régulièrement jusqu'à 0,8 m à la fin, où une paroi verticale le ramène au sol. On la monte dans le sens de la piste et on décolle au bout ; la prendre à l'envers, c'est heurter un mur de 0,8 m. Sur une ligne droite, une rampe de 0,4 à 0,55 fait environ 5 m de long, soit une pente d'à peu près 16 % ;
- le **dos d'âne** est une bosse arrondie, nulle à ses deux bouts et haute de 0,3 m au milieu, qu'on franchit dans les deux sens ;
- la **barrière** réserve 1 unité de large dans les données mais son mur n'en fait que 0,4 m, collé au bord extérieur de cette emprise : entre la piste et le mur il reste donc un bas-côté praticable.

Un obstacle doit tenir dans sa tuile. La longueur réelle d'un objet suivi se déduit de la fraction et de la longueur de l'axe : c'est l'éditeur ou le générateur qui fait la conversion, le fichier stocke la fraction.

Le modèle n'interdit pas de barrer la piste avec un hazard : c'est à l'éditeur de le vouloir. Le générateur, lui, laisse toujours un passage (voir 5.3).

<TODO> Confirmer les tailles des hazards et les longueurs de rampe et de dos d'âne en roulant dessus (POC 3).

Il n'y a **aucun décor** hors des tuiles : le monde se limite aux hexagones, éclairés par une lumière d'ambiance. Le paysage d'une tuile (voir 2.2) est ce qu'on voit au-delà du bas-côté.

<TODO> Lister les hazards par environnement et leur emprise en unités.

### 2.5 Tuiles spéciales

Deux seulement : **départ** et **arrivée**. Pas de checkpoint, pas de ligne de secteur, pas de zone de respawn dédiée (le respawn se fait sur la dernière tuile parcourue, voir 3.8).

La tuile de départ est la première de la liste ; en mode Track elle porte aussi la ligne d'arrivée, en Rally l'arrivée est la dernière tuile. Ces deux tuiles peuvent tourner large et monter, mais **jamais en épingle**. La **ligne** est au milieu de la tuile, en travers de la piste, dessinée en damier ; en mode Track, c'est la même ligne qui donne le départ et compte les tours. C'est de la **peinture sur la route** : elle est posée deux centimètres au-dessus du revêtement pour qu'on la voie, et la voiture ne la touche pas — franchir la ligne ne doit ni secouer ni faire sauter.

### 2.6 Règles d'assemblage

Deux tuiles s'enchaînent si la face de sortie de la première et la face d'entrée de la seconde portent exactement le **même profil** :

- même largeur et même position de piste et de bas-côtés,
- même hauteur,
- mêmes types de piste, de bas-côté et de paysage.

Tout changement se fait à l'intérieur d'une tuile, jamais à la jonction : la transition est finie quand on atteint la face, quelle que soit son étendue (voir 2.2). Une tuile est donc un « connecteur » entre un profil d'entrée et un profil de sortie.

Une piste est une **liste ordonnée de tuiles** : chaque tuile suit la précédente, et sa position dans l'espace se déduit de la liste. Il faut donc **interdire trop de virages serrés consécutifs** pour que la piste ne se recoupe pas (voir 5.5).

### 2.7 Hors piste et limites du monde

- **Quitter la piste** n'est pas une faute : on roule sur le bas-côté puis dans le paysage, avec le grip correspondant, et on revient. Un paysage bloquant arrête la voiture comme un mur.
- **Sortir de l'hexagone** (tomber du terrain) :
  - en **Track** et **Rally**, la voiture est remise immédiatement au centre de la dernière tuile parcourue, à l'arrêt ;
  - en **Collapse**, la partie est perdue.
- **Les tuiles ont une épaisseur.** Le monde n'a pas de sol : sous le contour de chaque tuile, une **jupe** verticale descend jusqu'à un niveau commun à toute la piste, situé sous son point le plus bas. La jupe est donc visible même quand la piste est à l'altitude 0, et c'est elle qui rend lisibles les marches entre tuiles voisines (voir 2.3) et le vide au bord du terrain.

<TODO> Épaisseur de la jupe sous le point le plus bas, 2 m pour fixer les idées.

---

## 3. La voiture et sa conduite

### 3.1 Le véhicule

Plusieurs voitures, **customisables**, pour porter une progression : des voitures et des améliorations à débloquer avec des crédits gagnés en course (voir 6.2).

Progression prévue :

1. **Une seule voiture de départ**, basse en tout : peu puissante, peu maniable, peu robuste.
2. Puis une **petite voiture maniable**, genre R5 Turbo ou Golf GTI.
3. Puis une **berlinette** genre Alpine, plus puissante et plus maniable encore.

**Caractéristiques d'une voiture.** Ce qui fait son caractère, fixé par le modèle et non modifiable au garage :

- vitesse de pointe, accélération, robustesse ;
- **transmission** : propulsion, traction ou quatre roues motrices. La propulsion pousse au survirage et se conduit à l'accélérateur, la traction tire la voiture en sortie de virage et pardonne plus, les quatre roues motrices collent au sol sur les revêtements meubles. Trois caractères de conduite pour le prix d'un réglage de différentiels, à essayer dans le POC 1 ;
- **braquage dégressif avec la vitesse** : l'angle de braquage maximal décroît linéairement d'une valeur à l'arrêt à une valeur à haute vitesse, atteinte à une vitesse donnée. Trois nombres par voiture (angle à l'arrêt, angle à vitesse, vitesse de plein effet) qui règlent la maniabilité : la petite voiture garde beaucoup de braquage à haute vitesse, vive mais instable ; la grosse berline le perd vite, stable mais paresseuse en entrée de virage. Validé dans le POC 1 avec 32° à l'arrêt et 12° à 100 km/h.

**Options achetables au garage.** Des aides à la conduite que le joueur achète avec ses crédits, voiture par voiture, puis règle à son goût. Elles sont **coupées par défaut** : à la manette la conduite brute est plus plaisante, l'option compense une entrée moins précise ou un pilote moins sûr.

- **ABS** : réduit le freinage quand les roues bloquent. Réglable : seuil de glissement à partir duquel il agit et force de la réduction. Ne touche jamais le frein à main, dont le blocage est le but.
- **Contrôle de traction** : réduit l'accélérateur quand les roues patinent, surtout utile sur terre et boue en sortie de virage. Mêmes réglages que l'ABS.
- **Aileron / spoiler** : un appui aérodynamique qui plaque la voiture au sol d'autant plus qu'elle va vite. Plus de grip et de stabilité à haute vitesse, rien à basse vitesse. Réglable : force de l'appui et répartition avant / arrière (un aileron arrière charge l'arrière). Il se voit sur la voiture, mais c'est d'abord un effet de conduite.

Chaque option a un prix d'achat ; ses réglages sont libres une fois achetée. Les niveaux d'option (par exemple un ABS plus fin, plus cher) restent à définir avec le barème des crédits (voir 6.2).

**Piste d'essai.** Le garage donne accès à une **piste d'essai** où le joueur roule avec la voiture telle qu'il vient de la configurer, sans chrono ni enjeu. Les options et leurs réglages s'y changent **en direct**, sans repasser par un menu, pour sentir immédiatement ce que change un aileron, un ABS ou un curseur. La piste enchaîne les situations utiles : une ligne droite pour la vitesse de pointe et l'appui, des virages rapides et une épingle, au moins deux revêtements dont un meuble, une bosse ou un saut pour les suspensions.

<TODO> Caractéristiques chiffrées par voiture (vitesse, accélération, robustesse, transmission, les trois nombres du braquage) et prix des options.

### 3.2 Ressenti de conduite

Arcade, sans être basique. Après dix secondes le joueur doit sentir trois choses : **la glisse**, **la différence entre deux revêtements**, et **les suspensions** qui travaillent sur les bosses et les atterrissages.

### 3.3 Commandes

Actions : accélérer, freiner / marche arrière, tourner, frein à main, reset (maintenu trois secondes, voir 3.8), et monter / descendre un rapport quand la boîte est en manuel. Pas de contrôle de caméra.

**Manette** (le mode de référence, analogique) :

| Action                        | Commande             |
| ----------------------------- | -------------------- |
| Accélérer                     | Gâchette droite      |
| Freiner / marche arrière      | Gâchette gauche      |
| Tourner                       | Stick droit          |
| Frein à main                  | A                    |
| Rapport supérieur / inférieur | R1 / L1              |
| Reset                         | Y                    |
| Menus : naviguer              | Stick droit ou croix |
| Menus : valider               | A                    |
| Menus : retour                | B                    |

**Clavier** (PC, on accepte la perte de l'analogique) :

| Action                        | Commande        |
| ----------------------------- | --------------- |
| Accélérer, freiner, tourner   | WASD ou flèches |
| Frein à main                  | Espace          |
| Rapport supérieur / inférieur | E / Q           |
| Reset                         | R               |
| Menus : valider               | Entrée          |
| Menus : retour                | Échap           |

**Tactile** (mobile) :

- un **palonnier vertical à gauche** pour accélérer et freiner,
- un **palonnier horizontal à droite** pour la direction,
- un **bouton au milieu** pour le frein à main,
- pas de changement de rapport : la boîte est automatique au tactile,
- menus au toucher.

### 3.4 Comportement par surface

C'est le cœur du POC 1. Le principe : **chaque surface impose une manière de prendre les virages**.

- Sur **asphalte**, il est plus rapide d'éviter la glisse : on freine, on tourne, on réaccélère.
- Sur **sable et gravier**, éviter la glisse est impossible : les virages se prennent en dérapage.
- Une **épingle** doit se passer efficacement au frein à main, quelle que soit la surface.

Asphalte, gravier et les autres sont ici des exemples de ressenti ; dans les données ce sont des rangs de la palette d'un environnement (voir 2.2) : l'asphalte est la piste 1 d'Europe, le gravier la piste 2 ou 3 d'Afrique.

<TODO> Neige et glace : à définir, sans doute une glisse encore plus longue et un freinage très allongé.

<TODO> Pour chaque type de piste, de bas-côté et de paysage : adhérence longitudinale, adhérence latérale, freinage, effet sur la vitesse de pointe, rugosité (ce qui secoue la voiture et la caméra).

### 3.5 Dérapage et frein à main

Le dérapage est un **outil de pilotage**, pas une punition. On l'engage par un coup de frein à main ou par un transfert de masse sur surface meuble, on le tient à l'accélérateur, on le rattrape au volant.

Si le joueur **abuse de la glisse, il part en tête-à-queue**. Il s'en sort en marche arrière : **le frein maintenu enfoncé une fois la voiture à l'arrêt** passe la marche arrière.

### 3.6 Sauts et comportement en l'air

**Pas de contrôle en vol**, ou un contrôle très léger. La trajectoire se décide avant la rampe : c'est ce qui rend les sauts intéressants.

**Voiture retournée** : elle reste sur le toit, pas de remise automatique sur ses roues. Le joueur s'en sort par le reset manuel (voir 3.8).

### 3.7 Collisions

Collisions contre les obstacles, les barrières et les paysages bloquants. Elles produisent des **dégâts cosmétiques et pénalisants** :

- **Sur la voiture** : texture abîmée, déformation simple du modèle.
- **Dans le HUD** : un schéma de la voiture indique ce qui est abîmé.
- **Dans la conduite** : l'élément abîmé dégrade le comportement.

| Partie     | Effet quand elle est abîmée          |
| ---------- | ------------------------------------ |
| Moteur     | Perte de vitesse                     |
| Suspension | Perte de stabilité                   |
| Direction  | La voiture tire à gauche ou à droite |
| Roue       | Glisse accrue                        |

Les dégâts sont **remis à zéro à chaque course**. Si un mode Campagne voit le jour (voir 4.6), ils deviendront persistants dans ce mode uniquement.

### 3.8 Réinitialisation

- **Reset manuel** : un bouton maintenu **trois secondes** remet la voiture au centre de la dernière tuile parcourue, dans le sens de la piste, à l'arrêt. Le chrono continue.
- **Sortie du terrain** : remise immédiate au centre de la dernière tuile, à l'arrêt, en Track et Rally. En Collapse, la partie est perdue.
- **Raccourci** : couper assez large pour sauter une tuile entière n'avance à rien ; la voiture est remise sur la dernière tuile parcourue, comme après une sortie de terrain. Passer sur la tuile voisine, en avant comme en arrière, reste normal.
- **Où, exactement** : au centre de la tuile quand la place y est libre, sinon **à la place libre la plus proche du centre** — décalée en travers de la piste, ou un peu plus loin sur son axe, jamais en arrière. On ne réapparaît donc pas dans un obstacle. Si la tuile est entièrement barrée, on revient au centre.

### 3.9 Caméra

Vue **du dessus**, qui suit l'orientation de la voiture. Sa **hauteur varie avec la vitesse** : plus on va vite, plus on voit loin. Elle pourra s'orienter légèrement vers la prochaine tuile pour aider à anticiper.

Le point visé devant la voiture **glisse avec elle** : il se tient une tuile devant sa position le long de la piste, et non au milieu de la tuile suivante. Le regard tourne donc de façon continue, sans à-coup au franchissement d'une face.

---

## 4. Modes de jeu

### 4.1 Tronc commun

- Compte à rebours **3, 2, 1, GO** au départ.
- Un **chrono** tourne pendant toute la partie.
- **Pas de pause** : une partie dure moins de cinq minutes, on la finit ou on la quitte.
- Un **écran de fin** (voir 4.5).
- Dans tous les modes, seules les tuiles autour du joueur sont affichées (voir 9.2).

### 4.2 Mode Track (boucle)

Une piste fermée, **deux ou trois tours** au plus pour rester court. Le score est le **chrono total**. Pas de chrono au tour, pas de fantôme.

### 4.3 Mode Rally (point à point)

Un départ, une arrivée distincte. Le score est le **chrono total**. Pas de secteurs, pas de temps intermédiaires, pas de fantôme.

### 4.4 Mode Collapse

La piste est **générée procéduralement** (voir 5.3) et n'a pas de fin.

- La piste **apparaît devant** la voiture, avec X tuiles d'avance sur la position courante.
- Elle **disparaît derrière**, à Y tuiles du joueur.
- Un **rythme minimum** avance le front de disparition. Si le joueur va plus vite, la piste suit son rythme. S'il va moins vite, il voit le terrain disparaître derrière lui et se rapprocher.
- Le rythme est **lent au début et augmente** jusqu'à dépasser la vitesse de pointe des voitures en ligne droite : la fin est inévitable, au bout de **cinq minutes au maximum**.
- La partie est perdue quand la piste se dérobe sous la voiture ou quand la voiture sort du terrain.
- Le score est le **temps tenu**.

Le HUD porte un indicateur du front de disparition (voir 7.2).

<TODO> Fixer X et Y dans le POC 2 pour la caméra, la courbe du rythme dans le POC 3, une fois les vitesses des voitures connues.

### 4.5 Fin de partie et résultats

Une **boîte de dialogue** avec le score : le chrono en Track et Rally, le temps tenu en Collapse. Deux boutons : **Retry** et **Home**. Rien d'autre.

### 4.6 Modes envisagés mais hors v1

Par ordre d'arrivée probable :

1. **Défi quotidien** : le mode Collapse sur une piste aléatoire nouvelle chaque jour, la même pour tout le monde.
2. **Campagne / Tournoi** : une succession d'épreuves avec une voiture choisie au départ, améliorable entre deux épreuves, et des **dégâts persistants** d'une épreuve à l'autre.
3. Après l'ajout d'une IA : **Race**, une boucle contre trois bots, le premier à finir X tours gagne.
4. Après l'IA aussi : **Collapse en groupe**, où le but est de faire sortir les autres de la piste ; le dernier en jeu gagne.
5. **Multijoueur** en ligne, bien plus tard.

---

## 5. Pistes et contenu

### 5.1 Pistes livrées avec le jeu

Par environnement : **trois pistes Track** (boucles) et **trois pistes Rally** (lignes). **Toutes ouvertes** dès le départ : la progression est dans les voitures, pas dans les pistes.

### 5.2 Éditeur de pistes

Un éditeur **accessible à tous**, mais **PC uniquement** (clavier et souris).

- L'éditeur s'ouvre avec la seule **tuile de départ**, dont on configure le profil : types de piste, de bas-côté et de paysage, largeurs, position.
- On **ajoute une tuile uniquement en sortie de la dernière** tuile posée. Son profil d'entrée est **figé** au profil de sortie de la précédente ; on ne configure que sa face de sortie, la position et la largeur de la piste en sortie, la déclivité, les types de revêtement en sortie et les obstacles.
- On ne peut **supprimer que la dernière tuile**.
- On teste la piste et on la **sauvegarde dans le stockage local** pour y jouer ensuite.

L'éditeur affiche toutes les tuiles de la piste en même temps, contrairement au jeu qui n'en affiche qu'une fenêtre (voir 9.2).

### 5.3 Génération procédurale

Uniquement pour le mode Collapse.

Sur le modèle de la forge de hexact : une **graine** (seed) et quelques **cadrans** tiennent dans une seule chaîne et définissent le caractère de la piste : plutôt tournante ou plutôt droite, environnement, ampleur des déclivités, densité d'obstacles. Le cadran de relief dit à la fois **combien de tuiles changent de hauteur et de combien** : à 0 la piste est plate, à 9 chaque tuile monte ou descend, de la moitié du seuil de sa sortie à la totalité. La même chaîne rend toujours la même piste, ce qui rend le défi quotidien possible.

Le générateur procède **comme l'éditeur** : il ajoute une tuile après l'autre à partir de la précédente, en tirant chaque paramètre de la graine, dans le respect de 2.6 et 5.5. Il produit donc toujours une piste jouable.

**Le générateur sait fermer une boucle.** Il produit une piste ouverte, en Rally, ou un **circuit en mode Track**, et la chaîne le dit : `n30` pour une ligne de trente tuiles, `l30` pour une boucle. Fermer une boucle n'est qu'une affaire de tracé, pas de raccord : dans une piste fermée le profil d'entrée de la première tuile **est** le profil de sortie de la dernière, si bien que largeurs, positions, revêtements et hauteurs se raccordent tout seuls dès lors que la dernière tuile reprend le profil de départ. Il reste donc à ramener le chemin sur la case de départ avec le bon cap, ce que le générateur fait en refusant, à chaque tuile, toute sortie qui mettrait la maison hors de portée, et en visant droit vers elle quand la marge se resserre.

Une boucle qui ne se ferme pas dans le budget de recherche **retombe sur une piste ouverte** en Rally, plutôt que de rendre un circuit ouvert que la validation refuserait. En pratique le générateur ferme toujours jusqu'à une trentaine de tuiles, presque toujours jusqu'à quarante, et de plus en plus rarement au-delà : une boucle longue s'enferme dans son propre tracé.

**Un hazard généré laisse toujours passer.** À l'endroit où il se pose, il reste au moins **une unité de piste libre d'un côté ou de l'autre** — de la piste seule, le bas-côté ne comptant pas. Le générateur ne tire donc pas un décalage au hasard : il tire parmi les seuls décalages qui tiennent cette promesse, ce qui laisse le hazard se poser aussi bien au milieu d'une large piste que contre un bord, ou sur un bas-côté, mais jamais au-delà du bloc piste + bas-côtés. Si la taille tirée ne rentre nulle part, il descend d'une taille (_large_, puis _medium_, puis _small_) ; si même _small_ boucherait la piste — une piste d'une unité sans bas-côté —, il pose une plaque à la place, qui ne bloque personne.

Le **nombre de tuiles** à générer se déduit de la distance que parcourt la voiture la plus rapide du jeu en ligne droite pendant la durée maximale d'une partie.

<TODO> Ce qui rend une piste générée intéressante : alternance droites et virages, variation de largeur, fréquence des obstacles, progression de difficulté avec le temps.

### 5.4 Format et partage de pistes

Sur le modèle de hexact : une piste est **un fichier texte lisible à la main**, avec un en-tête qui nomme le format et sa version, des paires clé/valeur (identifiant, nom, environnement, mode), puis la **liste ordonnée des tuiles** avec leurs paramètres.

Contrairement à hexact, où un plateau connaît la position de chaque case, une piste HexRace ne stocke aucune position : chaque tuile suit la précédente, et sa place dans l'espace se calcule à la lecture.

Une piste livrée avec le jeu, une piste faite dans l'éditeur et une piste générée pour le Collapse sont **le même objet**.

**Pas de partage entre joueurs dans un premier temps.** Une piste éditée est sauvegardée dans le stockage local du navigateur.

### 5.5 Validité d'une piste

Les contraintes sur les tuiles et leur succession (2.6) rendent jouable toute piste qui les respecte. Valider une piste, c'est vérifier :

- que chaque jonction respecte 2.6,
- qu'il y a un départ et une arrivée,
- que la piste **ne se recoupe pas** : aucune tuile posée sur une case déjà occupée. C'est le test d'occupation de la grille qui fait foi, une borne sur les virages serrés consécutifs ne suffit pas (six virages larges recoupent aussi) ; limiter les virages serrés enchaînés reste un réglage de style du générateur,
- en mode Track, que la piste se referme sur son départ.

---

## 6. Progression et rejouabilité

### 6.1 Chronos et records locaux

Le meilleur chrono de chaque piste et le meilleur temps tenu en Collapse sont mémorisés.

### 6.2 Objectifs et récompenses

Un système de **crédits** gagnés en course et dépensés en voitures et améliorations. **Pas de médailles.**

Les améliorations comprennent les **options de conduite** de 3.1 (ABS, contrôle de traction, aileron), achetées puis réglées au garage pour chaque voiture. Les caractéristiques propres à un modèle, dont le braquage dégressif, ne s'achètent pas : on change de voiture.

Pour commencer, les crédits sont **illimités** : le barème gain par course / coût des voitures se calibrera en jouant.

### 6.3 Fantômes

Non.

### 6.4 Sauvegarde

Tout est dans le **stockage local du navigateur** pour commencer : chronos, voitures, améliorations, crédits, pistes éditées. Une sauvegarde côté serveur viendra peut-être plus tard.

---

## 7. Interface et parcours du joueur

### 7.1 Écrans

Sur le modèle de hexact pour la structure et l'enchaînement.

```
Home ─┬─ Track ─── choix environnement ─── choix piste ─── Course ─── Résultats ─┬─ Retry
      ├─ Rally ─── choix environnement ─── choix piste ─── Course ─── Résultats ─┤
      ├─ Collapse  choix environnement ────────────────── Course ─── Résultats ─┴─ Home
      ├─ Garage (voitures, améliorations, crédits) ─── Piste d'essai (réglages en direct)
      ├─ Éditeur (PC uniquement)
      └─ Options
```

### 7.2 HUD en course

Affiché :

- vitesse,
- régime moteur,
- rapport engagé,
- état de la voiture (schéma des dégâts),
- chrono courant,
- en Collapse, l'indicateur du front de disparition,
- **l'aperçu des tuiles suivantes** : les X prochaines tuiles vues du dessus, en petit, pour savoir vers quoi on va. Il montre la forme de la piste, ses changements de largeur et de position, et les obstacles ; pas la position des autres voitures ni la piste entière. C'est la carte 2D du POC 2, réutilisée telle quelle sur un canvas du HUD. X reste à fixer avec la vitesse des voitures ; l'aperçu peut se couper dans les options.

Refusé : carte complète de la piste, secteurs, indicateur d'adhérence. On lit la surface à l'image.

### 7.3 Options

Volume, qualité graphique. Pas de remapping des commandes pour le moment.

### 7.4 Accessibilité

Rien de spécifique pour l'instant.

### 7.5 Inventaire des composants d'interface

Ce dont les écrans ont besoin, en trois familles. La règle : **tout ce qui est générique vient
d'Angular Material tel quel**, on ne le refait pas ; **les icônes sont les Material Symbols**, qui
suffisent ; seul ce qui est propre au jeu s'écrit.

**Repris de Material, sans retouche.**

| Composant                      | Où il sert                                                                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Boutons                        | partout ; un bouton primaire par écran, jamais plus                                                                                         |
| Menu                           | choix de mode et d'environnement, actions secondaires                                                                                       |
| Boîte de dialogue              | résultats (4.5), confirmations (quitter une course, écraser une piste éditée)                                                               |
| Snackbar                       | ce qui se dit en une ligne et disparaît seul : record battu, piste sauvegardée, manette branchée ou débranchée, source d'entrées qui change |
| Onglets                        | garage (voiture, améliorations, réglages), options                                                                                          |
| Cartes et listes               | choix de piste, choix de voiture, pistes éditées                                                                                            |
| Curseur                        | volume, réglages d'une option de garage (ABS, contrôle de traction, aileron)                                                                |
| Interrupteur, liste déroulante | options ; activer une aide ; qualité graphique                                                                                              |
| Barre de progression           | chargement de la physique au premier lancement, chargement d'une piste                                                                      |
| Info-bulle                     | PC seulement, sur les caractéristiques et les prix du garage                                                                                |

**Icônes (Material Symbols).** Étoile (record, favori), clé à molette (garage, réglages), manette,
clavier, main (tactile), chrono, drapeau (départ, arrivée), avertissement (dégât, faux sens),
cadenas (voiture ou piste verrouillée), pièce (crédits), haut-parleur et muet, plein écran, retour,
rejouer, maison, engrenage (options), voiture, crayon (éditeur), dé (piste aléatoire), partage,
téléchargement, téléversement. Une icône a toujours un libellé à côté ou une info-bulle : jamais
seule quand elle porte un sens que le joueur découvre.

**Propres au jeu.** Ce que Material ne fournit pas et qui s'écrit dans le module `hud` :

- **Conteneur de canvas.** Héberge le rendu 3D, un seul pour toute l'application, déplacé d'un écran
  à l'autre : plein écran derrière le HUD en course, dans un cadre à côté des réglages au garage où la
  voiture tourne lentement, dans l'éditeur, sur la piste d'essai, et dans chaque vitrine du lab. Il
  gère la taille et le ratio, et rien d'autre.
- **Compte-tours.** Un arc ou une barre, zone rouge à partir du régime de passage, qui clignote au
  rupteur ; cohérent avec ce que le son fait entendre.
- **Indicateur de rapport.** R, N, 1 à 9, en gros ; un flash au changement ; en boîte manuelle, un
  signe discret quand le régime est au bon moment pour monter.
- **Indicateur de vitesse.** En km/h uniquement, chiffres tabulaires pour qu'ils ne sautent pas.
- **Indicateur de dégâts.** La voiture schématisée vue du dessus, avec ses éléments distincts : moteur,
  boîte de vitesses, direction, châssis, les quatre roues et les quatre suspensions. Chaque élément
  porte un état en pourcentage, 100 % intact, 0 % cassé, rendu par une couleur continue ; l'élément
  qui vient d'encaisser pulse une fois. Les effets de chaque dégât sont ceux de 3.7, proportionnels à
  l'état.
- **Chrono.** Temps courant ; en Track le tour n sur N, le meilleur tour et l'écart au meilleur tour,
  vert ou rouge ; en Rally le temps total et les temps de passage ; en Collapse le temps tenu.
- **Compte à rebours de départ.** Trois, deux, un, go, plein écran, avec le son.
- **Aperçu des tuiles suivantes** (7.2) et **indicateur du front de disparition** en Collapse.
- **Jauge de reset.** Un anneau qui se remplit pendant les trois secondes de maintien (3.8), pour que
  le joueur sache qu'il est en train de réinitialiser et combien il reste.
- **Faux sens.** Un avertissement quand la voiture roule à l'envers de la piste.
- **Témoins d'assistance.** Une petite lampe par aide achetée (ABS, contrôle de traction) qui
  s'allume quand l'aide agit, comme au tableau de bord d'une vraie voiture : le joueur voit ce qu'il a
  payé travailler.
- **Palonniers tactiles.** Les deux palonniers et le bouton frein à main de 3.3, dessinés par-dessus
  la course sur écran tactile ; déjà écrits dans la vitrine des entrées, à reprendre ici.
- **Cartes de piste et de voiture.** Une piste : nom, environnement, longueur, meilleur temps, et sa
  miniature (la carte 2D du POC 2). Une voiture : silhouette, prix ou possédée, verrouillée ou non,
  et ses **barres de caractéristiques** (vitesse de pointe, accélération, robustesse, transmission).
- **Solde de crédits.** Toujours au même endroit dans les écrans hors course.
- **Écran de résultats.** Une boîte de dialogue Material dont le contenu est propre au jeu : le score
  de 4.5, le record s'il tombe, Retry et Home.
- **Panneau de debug.** Pour le développement et le lab, jamais dans le jeu livré, donc **lil-gui
  repris tel quel** : pas la peine de développer ce que le joueur ne verra jamais. Ses dossiers
  repliables, curseurs, cases, listes et relevés en lecture seule, complétés des ajouts du POC voiture
  : l'éditeur de courbes, la persistance des valeurs entre deux chargements et l'export des valeurs
  pour les reporter dans le code, plus un tracé en temps réel d'une grandeur (régime, glissement
  d'une roue, images par seconde). Il se cache et se montre d'une touche.
- **Compteur de performance.** Images par seconde et temps d'un pas physique, dans le panneau de debug
  et, en option, en coin d'écran pour la mesure sur mobile (9.2).

**Règles transverses.**

- Le HUD ne prend jamais le focus et ne reçoit aucun toucher, sauf les palonniers : tout passe
  au-dessus du canvas sans le gêner.
- Ce qui bouge à chaque image en course (vitesse, régime, chrono, aperçu) se rafraîchit à la fréquence
  d'affichage, sans le coût d'une détection de changement globale.
- Cibles tactiles d'au moins 44 px ; tailles en fraction de la hauteur d'écran pour que le HUD
  garde ses proportions du téléphone au moniteur.
- Thème sombre unique ; les couleurs d'état (échelle de dégâts, écart positif ou négatif) sont les
  mêmes partout et ne sont jamais le seul porteur d'information, une forme ou un texte les
  accompagne.
- Un seul endroit pour toutes les chaînes de texte, en anglais (9.4).
- Texte minimaliste, jamais de phrases complexes.

---

## 8. Direction artistique

### 8.1 Style visuel

Low poly. Textures pixelisées ou flat shading, ou un rendu plus daté genre _Destruction Derby 2_ sur PlayStation : polygones bruts, textures basses et tremblantes.

**Le gameplay passe avant la beauté graphique.** Quel que soit le style retenu, il ne doit **jamais dégrader la lisibilité de la piste** : depuis la caméra de la spec (voir 3.9), à la vitesse de pointe, on doit distinguer la piste du bas-côté et du paysage, reconnaître le revêtement (voir 8.2), voir venir un obstacle, une plaque ou une rampe à temps pour réagir. Un post-traitement qui floute, tremble, assombrit ou noie la piste sous un effet est refusé, même s'il est beau. On juge un style d'abord à la lisibilité en course, sur mobile, ensuite à son cachet.

<CHOIX> Flat shading pur, textures pixelisées avec un post-traitement, ou rendu à la PlayStation. À trancher en testant directement dans le POC 1, sur mobile, au niveau de performance visé, avec la lisibilité comme premier critère.

### 8.2 Lisibilité des surfaces

Une surface se reconnaît par sa **couleur** et sa **texture**, sans légende. Les trois zones d'une tuile (piste, bas-côté, paysage) doivent se distinguer au premier coup d'œil.

### 8.3 Effets

Ce qui sert le gameplay, rien de plus :

- **Dérapage** : traces de pneus, poussière ou particules selon la surface, son.
- **Collision** : particules, son.

### 8.4 Ambiance

Rien hors des tuiles. Une lumière d'ambiance. Pas de météo.

### 8.5 Audio

- **Moteur** : le son dépend du régime, avec le **rupteur** en bout de rapport et les **claquements d'échappement** au changement de rapport.
- **Roulement** selon la surface.
- **Dérapage**, **collisions**, **retours d'interface**.
- **Pas de musique.**

---

## 9. Plateforme et contraintes

### 9.1 Cibles

Navigateurs récents sur PC et mobile.

### 9.2 Performance

30 images par seconde au minimum, sur mobile.

Dans tous les modes, **seules les tuiles autour du joueur sont affichées** : X tuiles devant, Y tuiles derrière, comme en Collapse mais sans disparition. Cela borne le nombre de polygones à l'écran quelle que soit la longueur de la piste.

Une tuile qui entre dans cette fenêtre **apparaît en fondu** en 0,4 s, et celle qui en sort disparaît de la même façon avant d'être libérée : rien n'apparaît ni ne s'efface d'un coup au bord du champ. Une tuile reprise par la fenêtre pendant son fondu repart de là où elle en est.

### 9.3 Connexion

Entièrement hors ligne pour commencer.

### 9.4 Langue

Anglais uniquement, avec un texte minimaliste.

---

## 10. Périmètre et jalons

### 10.1 POC 1 : voiture sur terrain plat multi-surfaces

**Objectif** : trouver le ressenti de conduite et les valeurs de grip par surface, à la manette.

**Ce qu'on doit pouvoir faire** : rouler sur un terrain plat découpé en zones de surfaces différentes, avec au moins asphalte, gravier et glace, et quelques barrières. Essayer les deux rendus de 8.1.

**Validé quand** :

- on sent la différence entre deux surfaces sans regarder le sol,
- une épingle se passe au frein à main,
- sur asphalte, glisser fait perdre du temps ; sur gravier, ne pas glisser en fait perdre,
- abuser de la glisse envoie en tête-à-queue et on s'en sort en marche arrière,
- les suspensions se voient et se sentent,
- ça tourne à 30 images par seconde dans un navigateur mobile, avec les commandes tactiles de 3.3.

<TODO> Compléter les critères après les premiers essais.

### 10.2 POC 2 : construction d'un terrain hexagonal

**Objectif** : valider le modèle de tuile paramétrée, les règles d'assemblage et la génération. **Terrain seul, sans voiture** : la conduite sur tuiles est l'affaire du POC 3, et les surfaces sont réglées dans le POC 1. Ici les zones d'une tuile sont de simples couleurs.

**Ce qu'on doit pouvoir faire** : décrire une piste dans un fichier texte, la voir apparaître, l'inspecter avec une caméra libre. Générer une suite de tuiles à partir d'une graine, respectant 2.6 et 5.5. Déplacer un curseur « position du joueur » le long de la piste pour voir la fenêtre de tuiles se charger et se décharger.

**Validé quand** :

- toute suite de tuiles respectant 2.6 se raccorde sans couture visible,
- une piste fermée se referme sur elle-même,
- une piste invalide au sens de 5.5 est refusée avec la raison,
- toute graine donne une piste qui passe la validation,
- la taille de tuile (8 unités par côté) est confirmée ou corrigée : le profil et les transitions au milieu restent lisibles,
- la fenêtre d'affichage (X devant, Y derrière) ne se voit pas depuis une caméra placée comme celle de 3.9 au-dessus du curseur.

### 10.3 POC 3 : la voiture sur le terrain hexagonal

**Objectif** : marier les deux premiers POC et trouver ce qui ne se voit qu'en conduisant.

**Ce qu'on doit pouvoir faire** : parcourir avec la voiture du POC 1 une piste du POC 2, chaque roue prenant le grip de la zone et du revêtement de la tuile où elle se trouve.

**Validé quand** :

- toute suite de tuiles respectant 2.6 se passe sans accroc à la conduite,
- les changements de largeur, de position, de hauteur et de type au milieu d'une tuile se conduisent bien,
- une sortie légère sur le bas-côté à la jonction de deux tuiles ne fait pas tomber du terrain,
- la hauteur maximale par tuile est fixée (2.3) et le raccord d'une pente avec une tuile plate ne gêne pas,
- la fenêtre d'affichage ne se voit pas depuis la vraie caméra de la spec, à la vitesse de pointe.

### 10.4 MVP : première version jouable

**Un environnement, une voiture, une piste**, en mode Track. Avec le compte à rebours, le chrono, l'écran de résultats et la sauvegarde du meilleur temps. Sans garage, sans éditeur, sans Rally ni Collapse.

### 10.5 Après le MVP

Par ordre d'envie :

1. Les deux autres pistes Track, puis les trois Rally.
2. Mode Collapse et générateur.
3. Garage, crédits, voitures et améliorations.
4. Deuxième et troisième environnements.
5. Éditeur.
6. Défi quotidien.
7. Campagne / Tournoi.
8. IA et mode Race.
9. Collapse en groupe.
10. Multijoueur.

---

## 11. Décisions et questions ouvertes

### 11.1 Registre des décisions

| Date       | Décision                                                                                                  | Raison                                                                                 |
| ---------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| 2026-09-10 | TypeScript dans le navigateur, pas Godot                                                                  | Jouable sans installation, PC et mobile                                                |
| 2026-09-10 | Trois piliers : fun, simple, court                                                                        | Départager toute décision de conception                                                |
| 2026-09-10 | Tuile définie par paramètres, jamais dessinée                                                             | Assemblage garanti, génération procédurale possible                                    |
| 2026-09-10 | Unité = une largeur de voiture ; côté d'hexagone = 8 unités                                               | Marge de bas-côté aux jonctions, au moins 1 unité de paysage de chaque côté            |
| 2026-09-10 | Côté plat vers l'avant                                                                                    | Une face devant, une derrière, cohérent avec une piste qui traverse                    |
| 2026-09-10 | Une piste est une liste ordonnée de tuiles, sans positions                                                | Format simple, l'éditeur et le générateur travaillent pareil                           |
| 2026-09-10 | Changements de profil au milieu de la tuile                                                               | Jonctions toujours identiques des deux côtés                                           |
| 2026-09-10 | Par environnement : 3 pistes, 3 bas-côtés, 2 paysages                                                     | Palette bornée, tuiles transposables                                                   |
| 2026-09-10 | Pas de checkpoint, pas de secteurs, pas de fantôme, pas de pause, pas de médailles                        | Parties courtes, écrans minimaux                                                       |
| 2026-09-10 | Dégâts visibles et pénalisants, remis à zéro à chaque course                                              | Référence Wreckfest ; persistance réservée à une future Campagne                       |
| 2026-09-10 | Pas de contrôle en vol                                                                                    | Les sauts se préparent avant la rampe                                                  |
| 2026-09-10 | Caméra du dessus dont la hauteur suit la vitesse                                                          | Voir plus loin quand on va vite                                                        |
| 2026-09-10 | Troisième mode nommé Collapse                                                                             | Dit ce qui se passe, distinctif                                                        |
| 2026-09-10 | Score Collapse = temps tenu, pas nombre de tuiles                                                         | Plus lisible pour le joueur                                                            |
| 2026-09-10 | Pistes toutes ouvertes, progression par les voitures                                                      | Une seule dimension de progression                                                     |
| 2026-09-10 | Crédits illimités au départ                                                                               | Calibrer en jouant                                                                     |
| 2026-09-10 | Pas de partage de pistes en v1                                                                            | Stockage local seulement                                                               |
| 2026-09-10 | MVP = 1 environnement, 1 voiture, 1 piste Track                                                           | Le plus court chemin vers une partie complète                                          |
| 2026-09-10 | Anglais uniquement, texte minimaliste                                                                     | Un seul jeu de textes à maintenir                                                      |
| 2026-09-10 | Pas de musique                                                                                            | Le son sert la conduite                                                                |
| 2026-09-11 | Braquage dégressif avec la vitesse = caractéristique de la voiture                                        | Différencier petite maniable et grosse stable sans toucher à la physique               |
| 2026-09-11 | ABS et contrôle de traction = options achetables et réglables au garage                                   | Dépenser ses crédits ; coupées par défaut, la conduite brute prime                     |
| 2026-09-11 | Aileron = option garage à effet réel (appui aéro), pas seulement visuelle                                 | Une option qui se sent en conduite, pas un skin                                        |
| 2026-09-11 | Piste d'essai accessible depuis le garage, réglages modifiables en direct                                 | Sentir une option avant de sortir du garage                                            |
| 2026-09-11 | Faces nommées par les heures d'horloge                                                                    | Se calculent comme des nombres, deux caractères                                        |
| 2026-09-11 | Voiture retournée : reste sur le toit jusqu'au reset manuel                                               | Pas de magie ; le reset existe déjà                                                    |
| 2026-09-11 | Transmission (propulsion, traction, 4x4) = caractéristique de la voiture                                  | Trois caractères de conduite sans toucher à la physique                                |
| 2026-09-11 | Plaques (boue, glace, gravillons) ajoutées aux obstacles                                                  | Un piège de grip, sans collision, dans la palette de l'environnement                   |
| 2026-09-11 | POC 2 = terrain seul ; POC 3 = voiture sur le terrain                                                     | Se concentrer sur la génération ; les surfaces sont réglées dans le POC 1              |
| 2026-09-11 | Le gameplay passe avant la beauté graphique                                                               | Aucun style ni post-traitement ne doit dégrader la lisibilité de la piste              |
| 2026-09-11 | Obstacle posé par fraction de l'axe et décalage depuis le centre de la piste                              | Indépendant de la longueur de la tuile, suit la piste quand elle se déplace            |
| 2026-09-11 | Hazards nommés par taille (small, medium, large), pas par aspect                                          | L'aspect dépend de l'environnement, la taille du gameplay                              |
| 2026-09-11 | La barrière se pose sur l'unité qui borde la piste, sans contrainte sur le bas-côté                       | Jonctions simples entre une tuile avec barrière et une sans                            |
| 2026-09-11 | Aperçu des tuiles suivantes dans le HUD, carte complète toujours refusée                                  | Anticiper la piste ; réutilise la carte 2D du POC 2                                    |
| 2026-09-11 | Étendue de la transition dans une tuile = paramètre d'environnement                                       | Comme les grips ; toute la tuile lisse les courbes, à régler en roulant                |
| 2026-09-11 | Surfaces nommées par rang dans la palette, ordonnées par adhérence, jamais par matière                    | Transposition entre environnements ; l'asphalte n'est qu'un habillage                  |
| 2026-09-11 | Marches acceptées dans le paysage entre tuiles voisines par le côté, jamais sur la piste ni les bas-côtés | Le modèle ne fixe la hauteur qu'aux faces d'entrée et de sortie ; c'est du relief      |
| 2026-09-11 | Hauteur le long de la piste = spline monotone par les faces, pente déduite des voisines                   | Une montée régulière est une rampe, pas des paliers ; rien de plus dans le fichier     |
| 2026-09-12 | Recoupe = test d'occupation de la grille, pas une borne de virages serrés                                 | Exact ; la borne devient un réglage de style du générateur                             |
| 2026-09-12 | Pas de hauteur fixe de 20 cm, pente maximale par tuile 20 / 15 / 10 % selon la sortie, amplitude 200 m    | Le relief se pense en mètres ; le bord intérieur d'un virage est plus raide que l'axe  |
| 2026-09-12 | Départ et arrivée à n'importe quelle altitude ; jupe visible sous chaque tuile même à 0                   | Une piste peut descendre sous son départ ; le monde n'a pas de sol                     |
| 2026-09-12 | Tuiles de départ et d'arrivée jamais en épingle, ligne en damier au milieu                                | Une ligne lisible en travers de la piste                                               |
| 2026-09-12 | Côté d'hexagone de 8 unités confirmé au POC 2                                                             | Le profil tient, les transitions restent lisibles, les virages ont des rayons jouables |
| 2026-09-15 | Un hazard généré laisse toujours 1 unité de piste libre d'un côté, sinon il rétrécit ou devient une plaque | Sur une piste étroite, un hazard large bouchait tout ; l'éditeur reste libre de le faire |
| 2026-09-15 | Rampes et dos d'âne un peu plus fréquents sur les lignes droites                                          | On ne les voyait presque jamais ; hazards et barrières restent majoritaires            |
| 2026-09-15 | L'unité passe de 1,7 m à **2,5 m** : ce n'est plus une largeur de voiture mais une largeur de voie        | La voiture fait 1,6 m ; à 1,7 m la piste, les bas-côtés et les obstacles étaient à l'étroit. Les pentes se recomptent : 34, 23 et 10 pas |
| 2026-09-15 | Les hauteurs d'obstacles s'écrivent en **mètres** : hazard 1,5 m, barrière 1 m, rampe 0,8 m, dos d'âne 0,3 m | Une hauteur en unités grandissait avec l'unité ; un hazard aurait fait 2,5 m de haut   |
| 2026-09-15 | La **rampe et le dos d'âne sont des volumes** : plan incliné à paroi arrière, bosse arrondie              | Dessinés à plat ils étaient invisibles et inertes, alors que 2.4 leur demande de faire décoller |
| 2026-09-15 | La **ligne de départ et d'arrivée est de la peinture** : 2 cm au-dessus de la route, sans collision       | Relevée de 10 cm et solide, elle faisait un ralentisseur qui faisait sauter la voiture  |
| 2026-09-15 | Les **parois d'un objet suivi** sont orientées tranche par tranche                                        | Sur une barrière longue en virage, l'orientation d'ensemble en retournait une partie et la voiture passait au travers |
| 2026-09-15 | L'unité monte de 2,5 m à **3 m** : les pentes se recomptent, 41, 28 et 12 pas                                            | À 2,5 m la piste restait trop étroite : la plupart des virages se prennent en glisse, la voiture a besoin de bien plus que sa largeur |
| 2026-09-15 | Le générateur monte aux **trois quarts** des seuils de pente (31, 21 et 9 pas), au lieu de la moitié              | Avec des tuiles plus longues, la moitié donnait des pistes générées trop plates ; la main garde les seuils pleins                     |
| 2026-09-15 | Seuils de pente portés à **25 / 18 / 12 %** selon la sortie, soit 51, 33 et 15 pas                        | À 20 / 15 / 10 % les pistes restaient sages une fois l'unité à 3 m ; confirmé en roulant                                              |
| 2026-09-15 | Le cadran de relief commande la fréquence **et** l'ampleur : à 9 chaque tuile bouge, de la moitié du seuil à tout | Le cadran au maximum laissait 46 % de tuiles plates et une marche moyenne de 1,4 m : la piste paraissait plate            |
| 2026-09-15 | Le mur d'une barrière se dresse contre le bord de la piste, pas au bord extérieur de son unité réservée   | À 3 m d'unité il restait 2,6 m de vide entre la piste et le mur : on ne le frottait jamais                                            |
| 2026-09-15 | Un hazard épouse la pente de sa tuile, chaque coin à sa propre place sur l'axe                            | Posé de niveau, il flottait ou s'enfonçait dès que la tuile montait                                                                   |
| 2026-09-15 | Les traces de pneus s'effacent à chaque remise en course, rechargement compris                            | Les traces du run précédent restaient sur la ligne de départ                                                                          |
| 2026-09-15 | Pas de contour noir sur les tuiles ; le compteur de performance est allumé dans le lab                    | Le contour est une aide d'édition, pas un décor ; le compteur sert à chaque essai                                                     |
| 2026-09-15 | Trois pistes d'essai, Surfaces, Borders et Bends, chacune du plus adhérent au moins adhérent              | Sentir un revêtement, une bordure et un paysage en courbe demande une piste qui ne fasse varier qu'eux                                |
| 2026-09-15 | Aucune piste d'exemple sous **2 unités** de piste, et **3** dans l'environnement North                    | À 3 m l'unité, une voie d'une unité ne se conduit plus ; sur la neige et la glace il faut de la marge pour la glisse                  |
| 2026-09-15 | Le générateur fait aussi des **circuits** en mode Track, marqués `l` dans la chaîne, et retombe sur une ligne quand la boucle ne se ferme pas | Sans circuit généré, l'écran de choix du jeu n'avait que les exemples livrés ; fermer n'est qu'une affaire de tracé, le profil se raccorde seul |
| 2026-09-15 | La caméra vise une tuile devant la position continue, non le milieu de la tuile suivante                  | Le point glisse au lieu de sauter à chaque face franchie (3.9)                         |
| 2026-09-15 | Sauter une tuile en coupant remet la voiture sur la dernière tuile parcourue                              | Un raccourci ne rapporte rien ; c'est la remise de la chute (3.8)                      |
| 2026-09-15 | Remise à la place libre la plus proche du centre de la tuile, jamais en arrière                           | On réapparaissait dans les obstacles, posés justement au milieu (3.8)                  |
| 2026-09-15 | Fondu de 0,4 s des tuiles qui entrent dans la fenêtre et de celles qui en sortent                         | Le bord du champ sautait à l'œil en mode Rally (9.2)                                   |
| 2026-09-15 | La racine du site est le jeu ; `/lab` reste la porte du développeur, en lien discret sur l'accueil        | Le MVP se joue, il ne se visite plus par le banc d'essai (7.1)                          |
| 2026-09-15 | L'accueil ne montre que ce qui marche : une seule entrée, Track ; ni Rally, ni Collapse, ni garage        | Un bouton mort ment au joueur ; le MVP est court par définition (10.4)                  |
| 2026-09-15 | Le choix de piste liste toutes les boucles d'exemple que le modèle accepte, pas une seule                 | Neuf exemples existent déjà ; en montrer plusieurs ne coûte rien et donne à rejouer      |
| 2026-09-15 | **Back en course ne quitte pas : il demande.** La course continue derrière la question                    | Pas de pause (4.1), mais pas de course perdue sur un appui malheureux non plus          |
| 2026-09-15 | Un menu se pilote au stick, à la croix, aux flèches, à la souris et au doigt, sans mode                   | Le survol ou l'appui choisit, le clic valide : la manette et le tactile cohabitent      |

### 11.2 Questions ouvertes

| Réf. | Question                                                                                                                                     |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 8.1  | Flat shading, textures pixelisées avec post-traitement ou rendu à la PlayStation, à tester dans le POC 1 ; la lisibilité de la piste tranche |

---

## Annexes

### A. Glossaire

- **Unité** : une largeur de voie, 3 m. Toutes les dimensions d'une tuile se comptent en unités ; les hauteurs, elles, se comptent en mètres.
- **Tuile / hexagone** : unité de construction d'une piste, 8 unités de côté, définie par ses paramètres.
- **Face** : un des six côtés d'une tuile, nommé par une heure d'horloge. La piste entre par la face 6 et sort par une autre.
- **Profil** : sur une face, la largeur, la position, la hauteur et les types de piste, de bas-côté et de paysage. Deux tuiles s'enchaînent si leurs profils coïncident.
- **Piste** : la partie roulante de la tuile, de 1 à 5 unités de large.
- **Bas-côté** : 0 ou 1 unité de chaque côté de la piste, avec son propre grip.
- **Paysage** : le reste de la tuile, au moins 1 unité de chaque côté, avec son propre grip, éventuellement bloquant.
- **Environnement** : un thème (Nord, Europe, Afrique) qui fixe la palette de surfaces et l'habillage des obstacles.
- **Pas de hauteur** : 20 cm ; les hauteurs d'une tuile se comptent en pas, de 0 à 1000.
- **Déclivité** : différence entre la hauteur de sortie et la hauteur d'entrée d'une tuile, en pas de hauteur.
- **Obstacle** : ce qui se pose sur une tuile par rapport à la piste, par une fraction de l'axe et un décalage depuis le centre : hazard (small, medium, large), barrière, rampe, dos d'âne, plaque.
- **Graine** : la chaîne qui définit entièrement une piste générée.
- **Front de disparition** : en Collapse, la limite derrière la voiture au-delà de laquelle la piste n'existe plus.
- **Reset** : remise de la voiture au centre de la dernière tuile parcourue.

### B. Croquis et schémas

Les schémas sont dans [`docs/croquis.html`](croquis.html), une page autonome à ouvrir dans un navigateur :

1. Grille côté plat vers l'avant et nommage des faces par heures d'horloge (2.1).
2. Les cinq traversées possibles : sortie 12, 2, 4, 10 ou 8 (2.1).
3. Le profil d'une face en huit unités : paysage, bas-côté, piste, bas-côté, paysage (2.1).
4. Une tuile vue de dessus et en coupe, avec changement de largeur, de position et de hauteur au milieu (2.3, 2.6).
5. Une boucle de douze tuiles sans aucune position écrite (2.6, 5.4).
6. Le fichier de piste qui décrit cette boucle ; sa syntaxe est illustrative et sera fixée par la spécification technique (5.4).
