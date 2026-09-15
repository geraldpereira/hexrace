# Direction artistique — cinq rendus, et ce qu'ils coûtent

Ce fichier garde l'exploration du style graphique menée le 2026-09-15, pour nourrir le `<CHOIX>`
resté ouvert en spec fonctionnelle 8.1. Il ne tranche pas à la place de la spec : quand une décision
sera prise, elle ira là-bas et ce fichier restera l'argumentaire.

Les cinq rendus tournent en direct, avec la palette d'Europe, les largeurs de voie et le brouillard
du dépôt : <https://claude.ai/artifact/M4BHJuqBym9UyLn3zrcm72>

## Ce que le moteur fait aujourd'hui

| Quoi         | État                                                          |
| ------------ | ------------------------------------------------------------- |
| Matériau     | `MeshLambertMaterial`, couleur par sommet, `DoubleSide`        |
| Ombrage      | Facettes (`flatShading`)                                       |
| Lumières     | Une directionnelle d'intensité 2,5, une ambiante de 0,4        |
| Ombres       | Portées, activées                                              |
| Textures     | Aucune, et **aucune coordonnée UV** sur les tuiles             |
| Brouillard   | De 30 à 120 m, couleur du ciel                                 |
| Résolution   | Native, rapport de pixels plafonné à 2                         |

**Le reproche fait au rendu actuel n'est pas la géométrie, c'est le vide à l'intérieur d'une zone.**
De grandes surfaces unies sous un seul soleil donnent un aspect plastique ; la facette, elle, est
lisible et sert le jeu.

## Les trois axes

- **Lumière.** Calculée à chaque image par le GPU, ou posée une fois pour toutes dans la couleur des
  sommets. Le second cas ne coûte plus rien à afficher mais fige l'heure du jour et supprime les
  ombres portées.
- **Texture ou aplat.** Une tuile n'a aucune UV. Toute proposition qui pose une image sur le sol
  demande donc de les créer, et de découper le maillage d'une tuile par zone pour qu'elle porte
  plusieurs images. Des UV planaires tirées de la position monde suffisent : éprouvé sur la branche
  `houle-paysage`.
- **Pixellisation.** Rendre dans une cible plus petite que l'écran puis agrandir au plus proche.
  C'est le seul levier de la liste qui **gagne** des images par seconde au lieu d'en coûter.

## Les cinq propositions

| Style             | Lumière            | Surface          | Pixels  | Blender | Texturing | Effets | Charge GPU      |
| ----------------- | ------------------ | ---------------- | ------- | ------- | --------- | ------ | --------------- |
| Aplat net         | Temps réel         | Aplat            | Natifs  | Faible  | Nul       | Faible | Référence       |
| Toon contouré     | Temps réel, 3 paliers | Aplat         | Natifs  | Moyen   | Faible    | Moyen  | + 1 passe/objet |
| Basse résolution  | Temps réel         | Texture nette    | Gros    | Faible  | Moyen     | Faible | − 60 à 80 %     |
| Texturé mat       | Temps réel         | Texture filtrée  | Natifs  | Moyen   | Élevé     | Moyen  | ≈ référence     |
| Lumière posée     | Cuite              | Aplat            | Natifs  | Faible  | Nul       | Faible | Le plus léger   |

**Aplat net** est l'état actuel, gardé comme référence de comparaison.

**Toon contouré** écrase l'éclairage en trois paliers et cerne les objets d'un contour noir. C'est la
lecture la plus immédiate des cinq, ce que la spec 8.1 place au-dessus de tout. Le contour est une
coque inversée, donc un appel de rendu de plus par objet : **il se pose sur les véhicules et les
obstacles, jamais sur le terrain**, où il dessinerait la triangulation.

**Basse résolution** rend la scène dans une image de quelques centaines de pixels de large puis
l'agrandit sans lissage. C'est la seule proposition qui allège la charge GPU, ce qui compte puisque
le jeu vise le mobile (spec fonctionnelle 9.2).

**Texturé mat** est la seule qui règle vraiment le vide à l'intérieur des grandes surfaces. Son coût
n'est pas là où on l'attend : il est dans les UV que les tuiles n'ont pas et dans les neuf jeux de
textures à dessiner, pas dans le code.

**Lumière posée** calcule le soleil une fois, au moment de bâtir les triangles d'une tuile, et le
range dans la couleur des sommets. Plus aucune lumière à l'exécution. C'est le filet de sécurité si
le mobile peine, et elle se décide tard sans rien casser.

## Ce qui a été dit, le 2026-09-15

- **La basse résolution plaît.** À confirmer en réglant la résolution en direct, sur une vraie piste
  et pas seulement sur la maquette ; c'est pour cela qu'elle doit devenir un réglage du panneau debug
  avant toute décision.
- **Recommandation retenue pour l'instant** : basse résolution d'abord, contour toon ensuite. Les deux
  se combinent, aucun des deux ne demande d'artiste, et le premier rend de la performance au lieu d'en
  prendre. Le texturé mat attend qu'on ait quelqu'un pour dessiner les textures.

## Les textures seront générées

**Oui, et c'est la raison pour laquelle la basse résolution est bon marché.** À deux cent quarante
pixels de large, une texture ne couvre que quelques dizaines de pixels à l'écran : rien de plus fin
ne survit à la réduction. Ce qu'une texture doit apporter à cette échelle est du grain, du contraste
local et une variation qui empêche la surface de paraître morte, et c'est exactement ce qu'un bruit
paramétré sait faire.

Le code a déjà ce qu'il faut : le service de bruit est déterministe, donc une texture se régénère à
l'identique sans être stockée, et les couleurs sont rangées par environnement et par rang. Une même
fonction de grain, teintée par la palette, donne les neuf textures du terrain.

Deux réserves. Un bruit généré ne sait pas faire de **structure** : une flèche peinte au sol, une
bouche d'égout, un logo resteront des images dessinées. Et la **livrée d'une voiture** est le cas
typique où l'on voudra une vraie image, parce qu'elle porte l'identité du véhicule et qu'on la
regarde de près.

D'où la forme proposée : le grain de base généré par le code pour tout le terrain, avec la
possibilité de remplacer un rang par une image le jour où l'envie vient.

## Les modèles 3D

**Pas de `.glb` récupérés sur le net.** Deux raisons : les licences, qu'il faudrait vérifier et
tracer une par une, et la cohérence, parce que des modèles d'auteurs différents ne partagent ni
échelle, ni densité de polygones, ni convention de pivot. Pour une voiture unique ça passerait ; pour
un jeu qui en veut plusieurs c'est un piège.

Deux voies restent ouvertes, et elles se complètent.

**Blender piloté par MCP** : le modèle est produit par script plutôt qu'à la main. Réaliste pour des
formes primitives assemblées — une caisse, des ailes, un aileron, une barrière, un rocher — et cela
donne des modèles cohérents entre eux, à l'échelle du jeu, avec ses conventions. Beaucoup moins
réaliste pour une carrosserie sculptée.

**Géométrie décrite dans le code**, comme les tuiles le sont déjà. C'est ce qui les rend
paramétrables, et une voiture bas polygone décrite ainsi reste possible.

Les deux styles recommandés demandent justement peu de modélisation : la basse résolution préfère
moins de détail, et le contour toon demande une silhouette nette plutôt qu'un maillage dense.

## Ce qui reste à faire

1. **Rendre la résolution de rendu réglable** dans `ThreeRenderer` et l'exposer au panneau debug, pour
   juger l'effet sur une vraie piste, à la caméra de course, sur mobile.
2. **Modéliser une voiture dans Blender**, par MCP, bas polygone, à l'échelle du jeu (caisse de
   1,6 × 3,8 m, une unité valant 3 m).
3. Puis trancher le `<CHOIX>` de la spec fonctionnelle 8.1 et le porter au registre.
