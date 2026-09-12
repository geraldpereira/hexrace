# POC Car

Prototype jetable pour valider la physique d'une voiture (Jolt `WheeledVehicleController`)
et, ensuite, les différents revêtements. Copie du projet `rally-game` avec la moto remplacée
par une voiture 4 roues motrices. Rien ici n'a vocation à être réutilisé tel quel dans HexRace.

## Lancer

```
make install
npm run dev
```

Ouvrir http://localhost:5173. Le panneau lil-gui (dev uniquement) expose moteur, boîte,
différentiels, suspension par roue et les courbes de friction longitudinale / latérale.

## Commandes

Manette (mapping standard Xbox) :

- Gâchette droite (RT) : accélérateur.
- Gâchette gauche (LT) : frein. Maintenue à l'arrêt, passe en marche arrière.
- LB : frein à main (roues arrière).
- Sticks gauche et droit : direction uniquement.
- Start : pause.

Clavier : `W` accélérer, `S` freiner / marche arrière, `A` / `D` ou flèches direction, `Espace` frein à main.

## Son

Le son moteur (Web Audio, procédural) ne démarre qu'après un clic ou une touche dans la page :
le navigateur l'exige, et la manette seule ne compte pas. Volume et timbre dans le dossier
« Engine sound » du panneau debug.

## À tester

- Tenue de route sur la piste, sous-virage / survirage au frein à main.
- Boîte auto et régime : courbe de couple, rapports et régimes de passage dans les dossiers Engine et
  Transmission (`src/rally/car/drivetrain.ts` pour les valeurs par défaut). Compte-tours et rapport
  en bas à droite du HUD.
- Sauts et réception (suspension longue course, barres anti-roulis).
- Revêtements : asphalte, gravier, terre, boue (`src/rally/terrain/surfaces.ts`). Chaque revêtement a ses
  courbes de friction, sa résistance au roulement, sa traînée et son grain procédural (bosses virtuelles
  sous chaque roue, injectées dans la précharge de suspension, et force latérale bruitée). La carte des surfaces se règle dans le dossier Terrain du panneau debug,
  les revêtements eux-mêmes dans le dossier Surfaces.
