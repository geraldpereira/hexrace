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

## À tester

- Tenue de route sur la piste, sous-virage / survirage au frein à main.
- Sauts et réception (suspension longue course, barres anti-roulis).
- Revêtements : friction par zone de terrain (à venir).
