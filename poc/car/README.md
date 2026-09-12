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
seule ne compte pas. Un rupteur hache l'allumage quand on tape le régime max ou qu'on monte un
rapport plein gaz, et le pot détone au rétrogradage pied levé. Cylindres, pipe, résonances,
souffle, saturation, rupteur et détonations dans le dossier « Engine sound » du panneau debug,
avec un bouton « Test pops ».

## Traces de pneus

Une roue qui glisse en longitudinal (bloquée au frein ou au frein à main, ou qui patine) laisse un
ruban au sol, posé sur le point de contact Jolt. Couleur et opacité viennent du revêtement : gomme
noire sur l'asphalte, ornière plus discrète ailleurs. La glisse latérale peut aussi marquer (« Sideways
too » dans le dossier Skid marks du panneau debug, avec les seuils et un bouton Clear).

## Crissement de pneus

Le bruit de glisse dépend du revêtement sous chaque roue. Un second AudioWorklet
(`src/rally/car/tyreProcessor.ts`) tient une voix par revêtement, mélange entre un crissement tonal
(bruit blanc dans une résonance aiguë dont la hauteur monte avec la glisse et tremble) et un
crissement granuleux (train de grains de bruit sous un passe-bas, plus un grondement). L'asphalte
siffle, le gravier crépite, la terre racle, la boue est étouffée. Les paramètres de chaque revêtement
sont dans `surfaces.ts` (`slideSound`) et se règlent dans le dossier « Tyre sound » du panneau debug,
avec l'intensité par revêtement en lecture. Le crissement suit exactement les traces au sol : mêmes
seuils de glissement, ceux du dossier « Skid marks ».

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
