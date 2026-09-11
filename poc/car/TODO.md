# TODO — POC voiture

Ce qui manque pour couvrir le POC 1 de la spec (`docs/specs-fonctionnelles.md`, 10.1), dans l'ordre
où on compte s'y attaquer. Le grain, les assistances arcade et les options garage sont faits et
commités ; leurs valeurs par défaut restent un premier jet à doser (voir plus bas).

## Valider les critères de la spec

- [ ] **Chrono au tour.** Ligne de départ sur la boucle, temps au tour courant et meilleur tour dans
      le HUD. Seul moyen de juger « sur asphalte glisser fait perdre du temps, sur gravier ne pas
      glisser en fait perdre » autrement qu'au ressenti.
- [ ] **Glace.** Ajouter le revêtement du Pays du Nord au tableau des surfaces : glisse la plus
      longue, freinage très allongé, grain quasi nul. À définir aussi dans la spec (3.4, `<TODO>`
      neige et glace).
- [ ] **Barrières.** Quelques barrières le long de la piste et en bord de terrain. Collision et effet
      sur la conduite seulement, pas de dégâts (hors POC 1).
- [ ] **Caméra de la spec.** Vue du dessus qui suit l'orientation de la voiture, hauteur qui monte
      avec la vitesse (3.9). Remplace la caméra de poursuite : la glisse et le braquage se perçoivent
      autrement, régler le ressenti avec la bonne caméra avant le POC 2.
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
- [ ] **Sauts.** Le terrain est quasi plat depuis le raffermissement des suspensions. Ajouter une ou
      deux rampes pour juger la réception, cœur du ressenti selon 3.2, et le « pas de contrôle en
      vol » de 3.6.

## Fait

- Revêtements asphalte, gravier, terre, boue : friction, résistance au roulement, traînée, grain
  (bosses virtuelles par précharge de suspension, force latérale bruitée).
- Courbe de réponse des entrées, braquage dégressif avec la vitesse (caractéristique de voiture),
  amortissement de lacet (tactile), contrôle de traction, ABS et appui aéro (options garage), tous
  réglables dans le GUI debug.
- Persistance du GUI sans les affichages en lecture seule ; carte des surfaces lue à l'endroit.
