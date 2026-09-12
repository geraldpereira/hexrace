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
- A : frein à main (roues arrière).
- LB / RB : rapport inférieur / supérieur, seulement si « Manual » est coché dans le dossier
  Transmission du panneau debug (le jeu reste en boîte auto). En manuel, la gâchette gauche ne fait
  que freiner : la marche arrière est le rapport R, sous la première et le point mort.
- Sticks gauche et droit : direction uniquement.
- Start : pause.

Clavier : `W` accélérer, `S` freiner / marche arrière, `A` / `D` ou flèches direction, `Espace` frein à main,
`Q` / `E` rapport inférieur / supérieur en manuel.

## Son

Le son moteur est procédural, sans échantillon : un AudioWorklet (`src/rally/car/engineProcessor.ts`)
tire une impulsion de pression par cylindre sur le cycle du vilebrequin, avec un décalage et un gain
propres à chaque cylindre, puis fait sonner trois résonances fixes d'échappement et un filtre en
peigne pour la longueur de pipe, ajoute un souffle d'admission sous charge et sature doucement.
Il ne démarre qu'après un clic ou une touche dans la page : le navigateur l'exige, et la manette
seule ne compte pas. Cylindres, pipe, résonances, souffle et saturation dans le dossier « Engine
sound » du panneau debug.

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
