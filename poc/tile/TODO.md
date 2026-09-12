# TODO — POC tuiles

Ce qu'il faut construire pour couvrir le POC 2 de la spec (`docs/specs-fonctionnelles.md`, 10.2 :
« construction d'un terrain hexagonal »), dans l'ordre où on compte s'y attaquer. Rien n'est commencé.
Comme `poc/car`, c'est un POC jetable : on valide le modèle de tuile paramétrée, les règles
d'assemblage et la génération, on ne construit pas le vrai package `tile`.

**Terrain seul, sans voiture.** Ce POC ne fait que produire et afficher du terrain : pas de Jolt, pas
de conduite. Les surfaces sont réglées dans le POC 1, on les représente ici par de simples couleurs.
Le mariage terrain hexagonal + voiture fera l'objet d'un POC à part, une fois les deux premiers finis ;
la spec en fait le POC 3 (10.3).

**Point de départ.** Projet Vite + TypeScript neuf, three.js pour le rendu, vitest pour les tests du
modèle. Caméra libre (OrbitControls) pour inspecter les raccords sous tous les angles.

## Construire, du plus simple au plus complet

- [ ] **Générateur à graine.** PRNG déterministe, une tuile après l'autre à partir de la précédente,
      quelques cadrans (tournant / droit, ampleur des déclivités, variation de largeur) dans la même
      chaîne (5.3). Même graine, même piste ; la piste générée passe la validation. Reprendre le
      principe de la forge de hexact. Champ graine dans le GUI, régénération instantanée.
- [ ] **Fenêtre de tuiles.** Un curseur « position du joueur » le long de la piste ; seules X tuiles
      devant et Y derrière existent dans la scène (9.2). Chargement et déchargement au passage d'une
      tuile à l'autre, sans allocation visible dans le profileur.
- [ ] **Tuiles départ et arrivée.** Marquage visuel de la première et de la dernière tuile ; en
      boucle, la même tuile porte les deux (2.5).

## Valider les critères de la spec (10.2) qui ne demandent pas de voiture

- [ ] Toute suite de tuiles respectant 2.6 se raccorde sans couture visible.
- [ ] Une piste fermée se referme sur elle-même.
- [ ] La fenêtre d'affichage (X devant, Y derrière) ne se voit pas depuis une caméra placée comme
      celle de la spec (3.9), simulée au-dessus du curseur de position.
- [ ] Une piste générée depuis n'importe quelle graine passe la validation (test vitest sur un grand
      nombre de graines).

## Reporté au POC 3 (spec 10.3, la voiture sur le terrain)

- Sans accroc à la conduite aux jonctions.
- Les changements de largeur, de position, de hauteur et de type au milieu d'une tuile se conduisent
  bien.
- Une sortie légère sur le bas-côté à la jonction ne fait pas tomber du terrain.
- Hauteur maximale par tuile (2.3, `<CHOIX>`) : on ne peut la fixer qu'en la conduisant. Ici on
  expose seulement la déclivité comme paramètre du générateur.
- Surface par roue depuis les coordonnées locales de la tuile (spec technique 4.1).

## Décisions à trancher ici, à reporter dans la spec

- [x] **Virages serrés consécutifs** (5.5). Tranché : une borne ne suffit pas (six virages larges
      recoupent aussi, trois serrés dans le même sens forment une boucle valide) ; le test
      d'occupation de la grille fait foi, la borne devient un réglage de style du générateur.
      Spec 5.5 mise à jour.
- [ ] **Grammaire du fichier de piste** (spec technique 3.3). Celle de `trackFile.ts` est la proposition
      du POC ; à reporter dans la spec technique une fois validée.
- [ ] **Taille de tuile** (8 unités par côté) : confirmer que le profil piste + bas-côtés + paysage
      tient et que les transitions au milieu restent lisibles.
- [x] **Étendue de la transition.** Tranchée : paramètre d'environnement (spec 2.2), le POC ayant
      montré qu'à 40 % de la tuile un décalage de 3 unités en virage fait une chicane et qu'à 100 %
      les mêmes tuiles donnent des courbes régulières. Valeur par environnement à régler en roulant
      (POC 3) ; le curseur de la page reste pour comparer.
- [x] **Pente aux faces.** Tranchée sans toucher au fichier de piste : la pente à une face se déduit
      des deux tuiles qui s'y touchent (spline cubique monotone, méthode de Steffen), et la hauteur
      dans la tuile est une cubique de Hermite. Montée régulière = rampe rectiligne, tuile plate =
      plate, pente nulle aux bouts d'une piste ouverte et là où la piste change de sens ; jamais
      d'arête. Spec 2.3 et 2.2 mises à jour, TODO technique 3.5 fermé.
- [ ] **Densité de sommets** pour que le balayage soit propre en flat shading, surtout en épingle
      (rayon 4, axe de 8,4 unités) : 24 échantillons par tuile aujourd'hui, quelques facettes sombres
      visibles sur la piste d'une épingle qui change de hauteur.
- [x] **Marches entre tuiles voisines par le côté.** Tranchée : acceptées dans le paysage comme
      relief, jamais sur la piste ni les bas-côtés, ce que la règle d'assemblage garantit déjà
      (spec 2.3). Rien à faire dans la validation.

## Fait

- **Types du domaine** (`src/model/`). `Face` et `ExitFace` en heures d'horloge avec le virage qu'elles
  impliquent ; `Profile` avec ses invariants (piste 1 à 5, bloc au plus 6, une unité de paysage de
  chaque côté, hauteur 1 à 20) et ses zones unité par unité ; `Tile` = face de sortie + profil de
  sortie, comme une ligne du croquis 6 ; `Track` = en-tête + liste ordonnée, le profil d'entrée d'une
  tuile étant celui de sortie de la précédente (2.6 tenue par construction), la tuile de départ
  entrant par la sortie de la dernière en boucle. Le Petit Anneau du croquis en fixture, 18 tests.
- **Placement** (`placement.ts`, `layout.ts`, `map2d.ts`). Grille axiale entière côté plat vers
  l'avant, orientation = direction de la face 12 en rang horaire depuis le nord ; la tuile suivante
  est la voisine derrière la face de sortie, orientée dans la direction de sortie. Fermeture d'une
  boucle et tuiles superposées détectées avec un message en clair. Passage aux unités du monde
  (côté 8, apothème 4√3), repères de face vus par le conducteur, test que la face de sortie d'une
  tuile coïncide point par point avec la face d'entrée de la suivante. Carte 2D sur canvas avec
  cinq fixtures (Petit Anneau, Triangle, Hexagone, Ligne droite, Recoupe) : le Petit Anneau se
  referme exactement et reproduit le croquis 5.
- **Axe d'une tuile** (`path.ts`). La courbe que suit le milieu de la piste, tangente aux deux faces :
  segment en ligne droite, arc de rayon 12 centré sur le centre de la tuile voisine pour un virage à
  60°, arc de rayon 4 centré sur le sommet commun pour un virage à 120°. Le profil est balayé le long
  de l'axe, constant sur 30 % à chaque bout, transition linéaire au milieu. La carte 2D dessine la
  piste ainsi, à largeur constante en virage. Longueurs d'axe : 13,9 en droite, 12,6 en virage
  large, 8,4 en virage serré. La géométrie 3D reprendra le même balayage avec la hauteur.
- **Bords des zones** (`sweep.ts`). Le centre de la piste suit sa propre courbe (axe de la tuile
  décalé du centre du profil courant) et les largeurs de piste et de bas-côtés se mesurent
  perpendiculairement à sa tangente, pas à l'axe de la tuile : sinon une piste qui se déplace en
  biais paraît plus étroite. Test : largeur constante à 1e-6 pendant un décalage en virage, bords
  exactement sur les profils des faces aux deux bouts. C'est ce que le maillage 3D utilisera.
- **Fixture Courbes** : catalogue de virages à 60° où la piste passe de la position 1 à la 6 et
  retour, virages qui se resserrent, s'ouvrent, grand virage à 120° sur deux tuiles, chicane,
  ouverture progressive d'une unité par tuile, bas-côtés des deux côtés. Rayons de l'axe de la piste : 9,5 à 14,5
  en virage large selon la position, 1,5 à 6,5 en virage serré, l'angle par tuile restant 0, 60 ou
  120°. Piste choisie mémorisée dans l'URL, canvas plein écran, notes `p1→6` et `h5→6` sur la carte,
  curseur d'étendue de la transition.
- **Fixture Catalogue** : les cinq sorties combinées à des décalages de position, en droite, en virage
  large et en épingle, vers l'intérieur comme vers l'extérieur, plus un décrochement épingle droite
  puis épingle gauche. Tout se raccorde et se dessine à largeur constante.
- **Obstacles** (`obstacle.ts`). Posés par rapport à la piste : fraction de l'axe le long, décalage en
  unités depuis le centre de la piste en travers. Hazards rigides nommés par taille (small 1×1,
  medium 2×1, large 2×2), orientés selon la tangente ; objets suivis entre deux fractions : barrière
  (bord de la piste, emprise d'une unité, modèle de 0,3), rampe et dos d'âne (largeur de la piste),
  plaque (décalage, largeur, revêtement). Validation : fractions dans la tuile, intervalle non vide,
  emprise dans l'hexagone. Dessinés sur la carte ; le Petit Anneau porte ceux du croquis 6 et
  quelques autres. Décision reportée dans la spec 2.4.
- **Polygones de zones** (`geometry.ts`) et **vue 3D** (`view3d.ts`). Une tuile se découpe en bandes
  balayées (bas-côté gauche, piste, bas-côté droit, coupées au milieu pour porter les types d'entrée
  puis de sortie) et deux polygones de paysage entre le bloc et le contour de l'hexagone ; test :
  l'aire totale vaut celle de l'hexagone à 0,3 % près pour toute sortie et toute orientation, avec
  transition. Vue three.js : un seul maillage plat coloré par rang de palette, obstacles en volumes
  (hazards et barrières extrudés, rampe, dos d'âne et plaque à plat), caméra libre, contours des
  tuiles en option, carte 2D en médaillon qui utilise les mêmes polygones. Aucune couture visible
  entre tuiles sur le Petit Anneau ni le Catalogue. Les changements de largeur, de position et de
  type au milieu de la tuile viennent du balayage, rien de plus à faire pour eux.
- **Hauteur et pente.** Tout point d'une tuile prend la hauteur de l'axe au point le plus proche
  (`axisParameter`), interpolée de l'entrée à la sortie avec la même transition lissée que le
  profil : sur une face, tous les points ont la hauteur du profil, les tuiles voisines par la route
  se raccordent exactement, et la pente est nulle aux faces donc **pas d'arête à la jonction**,
  la question de la spec technique 1.4 est réglée par construction. Le paysage est découpé en
  bandes le long des lignes d'égale hauteur (perpendiculaires à l'axe, rayons en virage), avec un
  échantillon par sommet de l'hexagone, ce qui recouvre l'hexagone exactement et évite les grands
  triangles vrillés. Au sommet commun d'une épingle, la hauteur est ambiguë (il appartient aux deux
  faces) : le paysage intérieur s'arrête à 0,01 unité du sommet. Jupes verticales sous le contour
  jusqu'à deux unités sous la tuile la plus basse, obstacles en prismes qui suivent la pente.
  Une unité de hauteur = une unité de largeur, à confirmer en roulant.
- **Découpage en tranches** (`tileSlices`, `tileQuads`). Première version : bandes triangulées par
  earcut et hauteur par reprojection de chaque sommet ; vue de côté sur la Ligne droite, la piste
  se penchait en travers dans les transitions et le bas-côté passait dessous puis dessus. Cause :
  earcut reliait des sommets de tranches éloignées, et les bords de piste, perpendiculaires à la
  tangente de la piste et non à l'axe, se reprojetaient à des avancements différents. Maintenant
  chaque point porte son avancement `s`, tous les points d'une tranche ont la même hauteur, et les
  quadrilatères ne relient que deux tranches voisines. Un hazard est de niveau à la hauteur de son
  centre, une bande d'obstacle prend la hauteur de chaque échantillon. `tileHeightAt` (par
  reprojection) reste pour les requêtes ponctuelles du POC 3.
- **Piste qui se recoupe** : la 3D ne construit que les tuiles jusqu'à la première qui en recouvre
  une autre (`validPrefix`), comme le fera l'éditeur qui refuse la tuile ; la carte 2D montre tout
  pour le diagnostic. Plus de scintillement sur la fixture Recoupe.
- **Relief dans les fixtures** : Courbes monte d'une unité par tuile sur les tuiles 9 à 11 et
  redescend sur 15 à 17 ; Catalogue monte sur 1 à 3 et redescend sur 12 à 14. Les marches entre
  tuiles voisines par le côté y apparaissent comme des fentes sombres dans le paysage.
- **Pente déduite des voisines** (`slope.ts`). `faceSlopes` donne la pente à chaque face d'une piste
  (Steffen), portée par les tuiles posées et utilisée par `heightOfS` (Hermite). Fixture Relief :
  ligne droite qui monte sur trois tuiles, crête et descente immédiate, plat, creux et remontée ;
  vue de profil, une seule courbe lisse sans palier. Boutons de vue « Dessus » et « Profil » dans la
  page. La hauteur ne dépend plus de l'étendue de transition, réservée à la largeur, la position et
  les types.
- **Environnement** (`environment.ts`). Un objet par environnement : palette de huit rangs avec une
  couleur chacun (Europe, Pays du Nord, Afrique ont des palettes distinctes), étendue de la
  transition (toute la tuile pour les trois, la recommandation du POC). La carte et la 3D prennent
  leurs couleurs et l'étendue dans l'environnement de la piste ; le curseur ne sert plus qu'à
  forcer une autre étendue pour comparer.
- **Format de fichier** (`trackFile.ts`). Le fichier du croquis 6 : en-tête `hexrace-track 1`, paires
  clé/valeur, section `[tiles]` avec une ligne par tuile (`exit pos w sh h t obs`), obstacles
  `hazard:small@0.5/1`, `barrier:left@0.3-1`, `ramp@0.4-0.6`, `patch:3@0.3-0.7/-0.5x1.5`. Parser
  avec messages par ligne, sérialiseur qui redonne la piste à l'identique (testé sur les huit
  fixtures). Les pistes de la page sont les fichiers `tracks/*.track`, rechargés à chaud par Vite ;
  `npm run tracks` les régénère depuis les fixtures et un test garantit qu'ils leur restent égaux.
- **Validation** (`validation.ts`). Un seul passage qui renvoie des problèmes structurés avec le
  numéro de tuile : en-tête, profils, case déjà occupée, fermeture en Track (désigne la dernière
  tuile), obstacles qui débordent. Les tuiles fautives sont surlignées en rouge sur la carte et
  cerclées en rouge dans la 3D. Fixture Invalide pour le voir : profil sans paysage à gauche, hazard
  qui déborde, tours hors Track. Le décalage de position par tuile n'est pas une erreur : avec la
  transition sur toute la tuile il ne fait plus de chicane, il passe en réglage du générateur.
