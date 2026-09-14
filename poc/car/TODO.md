# TODO — POC voiture

> **Repris le 2026-09-14 dans `packages/car` et la vitrine `lab/car`** ([fiche 2.7](../../docs/plan-de-construction.md)) : ce qui reste à faire y est listé, ce fichier n'est plus qu'une trace.

**En pause depuis le 2026-09-12.** Le ressenti, la boîte, les sons, les traces et les particules sont
en place et validés ; les critères restants du POC 1 (chrono, glace, barrières, caméra de la spec,
tactile, mesure mobile, rendus de 8.1) attendent une reprise, probablement avec le POC 3 qui met la
voiture sur les tuiles.

Ce qui manque pour couvrir le POC 1 de la spec (`docs/specs-fonctionnelles.md`, 10.1), dans l'ordre
où on compte s'y attaquer. Le grain, les assistances arcade et les options garage sont faits et
commités ; leurs valeurs par défaut restent un premier jet à doser (voir plus bas).

## Valider les critères de la spec


- [ ] Test son à partir de vrais samples voir ce que ça donne

- [x] **Boîte et régime moteur.** Moteur et boîte Jolt réglables dans le GUI (courbe de couple,
      inertie, rapports, temps de passage), compte-tours et rapport dans le HUD, boîte auto (mode
      manuel LB/RB en option debug), frein à main sur A. Son moteur procédural par impulsions de
      cylindres (AudioWorklet) avec rupteur, détonations et irrégularités : validé, pas
      d'échantillon. Le dosage fin de la courbe et des rapports se fera avec le chrono au tour.
- [x] Son de roulement par revêtement, bruit du vent, coups de suspension : un worklet châssis,
      paramètres de roulement dans `surfaces.ts`.
- [ ] **Passe de réglage du son.** Tout est en place (moteur, crissement, roulement, vent,
      suspensions) et sonne correctement ; refaire une passe d'ensemble plus tard pour doser
      niveaux, seuils et timbres en roulant, notamment les seuils de suspension (compression 1 à
      3,5 m/s), le niveau du vent et l'équilibre entre les couches.
- [x] Configuration du poids et de la position du centre de gravité de la voiture : dossier
      « Mass & balance », à chaud, valeurs par défaut dans `chassisSpec.ts`. Reste à trouver deux
      ou trois jeux de valeurs qui donnent des caractères distincts (spec 3.1).
- [~] **Collisions.** Testées avec la rampe et le dos d'âne, rien à ajouter au POC. Les dégâts et
      les sons de collision viendront plus tard, c'est bien plus simple que ce qui a été fait ici.
- [x] **Traces de pneus et particules.** Traces au blocage de roue : ruban par roue, couleur et
      opacité par revêtement, glisse latérale en option debug. Particules : bouffées et débris par
      revêtement, émission sur glisse et roulement. Crissement par revêtement. Tout est réglable dans
      le GUI, cadences et tailles à doser en roulant.
- [ ] **Chrono au tour.** Ligne de départ sur la boucle, temps au tour courant et meilleur tour dans
      le HUD. Seul moyen de juger « sur asphalte glisser fait perdre du temps, sur gravier ne pas
      glisser en fait perdre » autrement qu'au ressenti.
- [ ] **Caméra de la spec.** Vue du dessus qui suit l'orientation de la voiture, hauteur qui monte
      avec la vitesse (3.9). Remplace la caméra de poursuite : la glisse et le braquage se perçoivent
      autrement, régler le ressenti avec la bonne caméra avant le POC 3.
- [ ] **Tactile.** Source d'entrée tactile dans `src/engine/input/` : palonnier vertical à gauche
      (accélérer / freiner), palonnier horizontal à droite (direction), bouton central frein à main
      (3.3). Y brancher l'amortissement de lacet si la manette n'en veut pas.
- [ ] **Mesure mobile.** 30 images par seconde dans un navigateur mobile avec le tactile. Mesurer,
      noter le téléphone et le résultat dans le README.
- [ ] **Les deux rendus de 8.1.** Flat shading pur contre textures pixelisées avec post-traitement,
      comparés sur mobile au niveau de performance visé. Trancher le `<CHOIX>` de la spec.

## Réglages à sortir du POC

- [ ] **Tableau des surfaces (spec 2.2).** Par environnement : trois pistes, trois bas-côtés, deux
      paysages, avec grip longitudinal, grip latéral, freinage, effet sur la vitesse de pointe et
      rugosité. Les trouver ici, les écrire dans la spec.
- [ ] **Doser le grain.** Hauteurs de bosse, longueurs d'onde et forces latérales par revêtement sont
      un premier jet. Utiliser « Copy debug values » pour reporter les réglages dans `surfaces.ts`.
- [ ] **Rejuger le frein à main.** Le facteur de grip latéral arrière vaut 0,3 réel depuis les
      revêtements (0,55 avant, quand il n'était pas mis au carré). Jamais retesté depuis.
- [ ] **Transmission.** Le POC est en quatre roues motrices. Essayer propulsion et traction via les
      parts de couple des différentiels, dire si ça vaut une caractéristique par voiture (note 3.1).

## Décisions en attente qui se testent ici

- [ ] **Reset manuel.** Bouton maintenu trois secondes, voiture remise au centre de la piste dans le
      sens de la marche, à l'arrêt (3.8). Manque déjà pour tester une voiture retournée.
- [ ] **Voiture retournée.** Trancher le `<CHOIX>` de 3.6 : remise automatique sur ses roues après un
      court délai, ou attente du reset manuel.
- [ ] **Sauts.** Rampe et dos d'âne posés sur la piste (dossier Obstacles). Reste à juger la
      réception, cœur du ressenti selon 3.2, et le « pas de contrôle en vol » de 3.6.

## Fait

- Revêtements asphalte, gravier, terre, boue : friction, résistance au roulement, traînée, grain
  (bosses virtuelles par précharge de suspension, force latérale bruitée).
- Courbe de réponse des entrées, braquage dégressif avec la vitesse (caractéristique de voiture),
  amortissement de lacet (tactile), contrôle de traction, ABS et appui aéro (options garage), tous
  réglables dans le GUI debug.
- Persistance du GUI sans les affichages en lecture seule ; carte des surfaces lue à l'endroit.
