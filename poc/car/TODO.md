# TODO — POC voiture

## Conduite plus arcade

Assistances à insérer entre l'entrée manette et Jolt, chacune avec un curseur debug pour la doser.
Les trois premières d'abord, elles règlent l'essentiel sans changer le caractère de la glisse.

- [x] **1. Braquage dégressif avec la vitesse.** Angle max de 32° à l'arrêt, 12° à 100 km/h,
      interpolation linéaire entre les deux, dossier Steering du GUI (le curseur par roue a disparu).
- [x] **2. Amortissement de lacet.** Couple pur opposé à la vitesse de lacet autour de l'axe
      vertical du châssis, exprimé en taux de décroissance (1/s) grâce à l'inertie de lacet lue
      dans Jolt. Appliqué seulement roues au sol. Dossier Yaw damping du GUI. Désactivé par
      défaut, préréglé à 1 : à la manette la glisse brute est préférable, à garder pour le tactile.
- [x] **3. Courbe de réponse du stick.** Mélange linéaire / cube sur la direction, l'accélérateur
      et le frein, un curseur par axe dans le dossier Input response. Centre plus doux, plein
      débattement conservé en bout de course. Plus du confort qu'une assistance.
- [ ] **4. Assistance au contre-braquage.** Au-delà d'un seuil d'angle de dérive du châssis, ajouter
      automatiquement une fraction du contre-braquage qui ramène les roues avant vers la direction
      de la vitesse. Dosable de 0 (sim) à 1 (drift auto-tenu). À n'activer que si 1-3 ne suffisent pas.
- [x] **5. Contrôle de traction et ABS.** Deux limiteurs de glissement partagent le même code :
      au-delà d'un seuil de glissement longitudinal (le ratio Jolt, celui des courbes de friction),
      l'accélérateur (TC) ou le frein (ABS) est réduit, avec seuil, plage, force, vitesse mini et
      temps de relâchement. Le frein à main n'est pas touché. Dossiers Traction control et ABS du
      GUI, coupés par défaut : ce seront des options à acheter au garage pour chaque voiture.
- [ ] **6. Appui aérodynamique.** Force vers le bas proportionnelle au carré de la vitesse : plus
      d'adhérence et de stabilité à haute vitesse.
