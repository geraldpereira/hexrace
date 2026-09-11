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

- [ ] **Maillage plat d'une tuile.** Piste, bas-côtés et paysage en zones colorées, sans hauteur ni
      variation, profil identique en entrée et en sortie. Rendu three.js d'une piste entière.
- [ ] **Changements au milieu de la tuile.** Largeur, position et types différents entre l'entrée et
      la sortie, transition dans la moitié centrale (2.1, 2.6). Piste étroite qui entre à gauche et
      sort à droite.
- [ ] **Hauteur et pente.** Hauteur d'entrée et de sortie, pente au milieu (2.3). Sommets partagés à
      la jonction, aucune couture ni trou visible en caméra libre. C'est ici qu'on regarde la
      question de la spec technique (1.4, `<GPE>`) : une forte déclivité suivie d'une tuile plate
      fait une arête ; on la voit ici, on la conduira dans le POC suivant.
- [ ] **Format de fichier.** Fichier texte lisible à la main : en-tête avec format et version, paires
      clé / valeur, liste des tuiles (5.4, croquis 6). Parser avec messages d'erreur, sérialiseur,
      rechargement à chaud. Deux ou trois pistes d'exemple dans `tracks/`, dont la boucle du croquis.
- [ ] **Validation.** Règles 2.6 et 5.5 : jonctions, départ et arrivée, pas d'auto-intersection,
      nombre maximal de virages serrés consécutifs, fermeture en Track. Une piste invalide est
      refusée avec la raison, et la tuile fautive est surlignée dans la vue.
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

- [ ] **Virages serrés consécutifs** (5.5). Trouver le nombre au-delà duquel la piste se recoupe, et
      si une simple borne suffit ou s'il faut un vrai test d'occupation de la grille.
- [ ] **Grammaire du fichier de piste** (spec technique 3.3). Celle qui sort du POC devient la
      référence.
- [ ] **Taille de tuile** (8 unités par côté) : confirmer que le profil piste + bas-côtés + paysage
      tient et que les transitions au milieu restent lisibles.
- [ ] **Étendue de la transition.** La spec (2.3, croquis 4) la met dans la bande centrale ; le
      curseur de la page montre qu'à 40 % de la tuile un décalage de 3 unités en virage fait une
      chicane, et qu'à 100 % (transition sur toute la tuile, interpolation quintique, faces
      inchangées) les mêmes tuiles donnent des courbes régulières. Recommandation : 100 % pour la
      position et la largeur, à confirmer pour la hauteur en roulant (POC 3), puis corriger la spec.
- [ ] **Densité de sommets** pour que le balayage soit propre en flat shading, surtout en épingle
      (rayon 4, axe de 8,4 unités).

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
