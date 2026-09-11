# TODO — POC voiture

## Grain procédural (revêtements)

Force bruitée appliquée au point de contact de chaque roue, échantillonnée sur la distance parcourue
(`CarBehavior.applySurfaceForces`). Longueur d'onde et composantes verticale / latérale par
revêtement, curseurs dans le dossier Surfaces.

- [x] **Longueur d'onde par revêtement.** `Surface.wavelength` : gravier court (0,3 m, vibration),
      terre long (1,5 m, ornières), boue très long (3 m).
- [x] **Composante latérale.** `Surface.lateralRoughness`, force horizontale le long de l'axe
      latéral de la roue, bruit décalé pour ne pas être corrélé au vertical.
- [ ] **À doser en jeu.** Les valeurs par défaut sont un premier jet, à régler manette en main.

## Conduite plus arcade

Assistances à insérer entre l'entrée manette et Jolt, chacune avec un curseur debug pour la doser.
Les trois premières d'abord, elles règlent l'essentiel sans changer le caractère de la glisse.

- [ ] **1. Braquage dégressif avec la vitesse.** Angle max de 32° à l'arrêt, ~12° à 100 km/h,
      interpolation entre les deux. Réduit la nervosité à haute vitesse.
- [ ] **2. Amortissement de lacet.** Couple opposé à la vitesse angulaire autour de l'axe vertical,
      proportionnel à celle-ci. La voiture glisse toujours mais ne part plus en toupie, le
      contre-braquage a le temps d'agir. Préférer un couple pur en lacet à l'amortissement
      angulaire Jolt, qui touche aussi tangage et roulis.
- [ ] **3. Courbe de réponse du stick.** Mélange stick linéaire / stick³ sur la direction : centre
      plus doux, plein braquage conservé en bout de course.
- [ ] **4. Assistance au contre-braquage.** Au-delà d'un seuil d'angle de dérive du châssis, ajouter
      automatiquement une fraction du contre-braquage qui ramène les roues avant vers la direction
      de la vitesse. Dosable de 0 (sim) à 1 (drift auto-tenu). À n'activer que si 1-3 ne suffisent pas.
- [ ] **5. Contrôle de traction.** Réduire le couple moteur quand le glissement longitudinal arrière
      dépasse un seuil. Évite le patinage qui déclenche le survirage en sortie de virage, surtout
      sur terre et boue.
- [ ] **6. Appui aérodynamique.** Force vers le bas proportionnelle au carré de la vitesse : plus
      d'adhérence et de stabilité à haute vitesse.
