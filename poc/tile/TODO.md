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
- [ ] **Géométrie de la transition** : linéaire ou lissée, en largeur comme en hauteur ; densité de
      sommets nécessaire pour que ce soit propre en flat shading.

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
  referme exactement et reproduit le croquis 5. La transition au milieu de la tuile y est un simple
  quadrilatère, à faire proprement dans la géométrie 3D, surtout en virage serré.
