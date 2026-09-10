# HexRace - Spécifications fonctionnelles

> Jeu de rallye 3D arcade, low poly, jouable dans le navigateur, dont les pistes sont assemblées à partir de tuiles hexagonales paramétrées.

Ce document dit ce que le jeu **est** pour le joueur. Il ne dit rien de la manière de le construire : cela relève des spécifications techniques (`docs/specs-techniques.md`, à venir).

## Comment utiliser ce document

Ce qui est écrit en clair est décidé. Trois balises servent pendant la rédaction :

- **`<TODO>`** : c'est décidé, il reste à l'écrire ou à le préciser.
- **`<CHOIX>`** : ce n'est pas décidé, les options sont posées à la suite, il faut trancher avant de coder.
- **`<GPE>`** : une réponse de Gérald laissée dans le fichier entre deux passages, fondue ensuite dans le texte.

Toutes les `<CHOIX>` sont rassemblées en 11.2.

---

## 1. Vision

### 1.1 Pitch en une phrase

Un jeu de rallye vu du dessus où l'on enchaîne des virages en glisse sur des pistes faites d'hexagones, en moins de cinq minutes par partie, sur PC ou sur téléphone, dans le navigateur.

### 1.2 Piliers de conception

Trois principes départagent une décision quand on hésite :

1. **Le fun avant le réalisme.** Si une règle physique rend la conduite moins agréable, on la tord.
2. **Visuellement simple.** Low poly, peu d'éléments à l'écran, tout ce qui est affiché sert à conduire.
3. **Des parties courtes.** Cinq minutes grand maximum, quel que soit le mode. Une piste ou un mode qui déborde est raccourci.

### 1.3 Références et inspirations

- **Super Woden: Rally Edge** (ViJuDa, 2026) pour le ressenti : rallye arcade vu du dessus, glisse généreuse, plaisir immédiat. On lui emprunte aussi le garage où l'on achète, améliore et personnalise ses voitures.
- **Wreckfest** pour les dégâts : ce qui est abîmé se voit sur la voiture et se ressent dans la conduite.

Ce qu'on ne leur emprunte pas : la profondeur de simulation, les réglages fins, les courses longues.

### 1.4 Public et format de session

- **Appareil** : navigateur, sur PC et sur mobile. Le jeu doit tourner directement dans le navigateur mobile ; si ce n'est pas tenable, un portage viendra plus tard.
- **Session** : une partie complète en moins de cinq minutes, lancée et terminée sans engagement. Sur mobile, la référence est **une partie entre deux arrêts de métro ou de bus** : lancement immédiat, pas de menu à traverser, pas de sauvegarde à gérer.
- **Public** : joueur occasionnel qui aime les jeux de conduite arcade, à la manette de préférence.

### 1.5 Hors périmètre

- Pas de simulation poussée : pas de réglages de suspension, de transmission ou de pneus exposés au joueur.
- Pas de multijoueur dans un premier temps (voir 4.6).
- Pas de météo, pas de cycle jour/nuit, pas de décor hors des tuiles.
- Pas de musique.

---

## 2. Le terrain hexagonal

### 2.1 L'hexagone comme unité de base

Un **hexagone** (ou **tuile**) est l'unité de construction d'une piste. Il est défini par ses paramètres, jamais dessiné à la main : c'est ce qui permet de générer des pistes procéduralement et d'assurer que deux tuiles se raccordent.

**L'unité de mesure est la largeur d'une voiture.** Tout ce qui suit se compte en unités.

- **Orientation** : **côté plat vers l'avant**. Une tuile a donc une face devant, une face derrière, et deux faces de chaque côté.
- **Échelle** : un côté d'hexagone mesure **8 unités**. Cette largeur laisse de la marge pour qu'une légère sortie sur le bas-côté au passage d'une tuile à l'autre ne fasse pas tomber le joueur du terrain.
- **Traversée** : la piste entre par une face et sort par une autre. Selon la face de sortie par rapport à la face d'entrée, la tuile est une ligne droite (face opposée), un virage large (60°) ou un virage serré (120°). On ne sort jamais par la face d'entrée.
- **Profil sur une face** : de gauche à droite, du paysage, éventuellement un bas-côté, la piste, éventuellement un bas-côté, du paysage.
  - la **piste** fait de **1 à 5 unités** ;
  - chaque **bas-côté** fait **0 ou 1 unité** (absent par exemple quand une barrière borde la piste) ;
  - piste plus bas-côtés font **6 unités au plus**, de sorte qu'il reste **au moins 1 unité de paysage de chaque côté**. Une piste de 5 unités n'a donc qu'un bas-côté au plus ;
  - la **position** du bloc piste plus bas-côtés sur la face se donne en unités depuis la gauche.
- **Variation dans la tuile** : largeur, position et types peuvent différer entre l'entrée et la sortie. La piste se resserre, s'élargit ou se décale dans la tuile. Une piste étroite peut entrer à gauche d'une face et sortir à droite d'une autre.
- **Hauteur** : chaque tuile porte une hauteur d'entrée et une hauteur de sortie, entières, bornées (1 à 20 pour fixer les idées). Leur différence est la **déclivité** de la tuile, positive, négative ou nulle.
- **Obstacles** : une tuile peut porter des obstacles le long de la piste (voir 2.4).

**Nommage des faces.** Les six faces sont nommées par les **heures d'une horloge** : avec le côté plat vers l'avant, la face de devant est 12, celle de derrière 6, et les quatre faces latérales 2, 4, 8 et 10. Dans le fichier de piste, l'entrée d'une tuile est toujours la face 6 par convention (on vient de derrière), et seule la face de sortie est écrite : 12 pour une droite, 10 ou 2 pour un virage à 60°, 8 ou 4 pour un virage à 120°. L'orientation absolue d'une tuile se déduit de celle de la précédente.

<CHOIX> Convention à confirmer : heures d'horloge (ci-dessus) plutôt que points cardinaux. Voir la discussion en 11.2.

<GPE> ok pour les heures

### 2.2 Catalogue des surfaces

Une piste appartient à un **environnement**, et un niveau reste dans un seul environnement du début à la fin. L'environnement fixe l'apparence des tuiles, la palette de surfaces disponibles et l'habillage des obstacles.

Environnements prévus :

- **Pays du Nord** : neige, glace.
- **France / Europe** : routes bitumées en plus ou moins bon état.
- **Afrique** : terre, gravier.
- D'autres pourront suivre sur le même modèle.

Chaque environnement offre exactement :

- **3 types de piste**,
- **3 types de bas-côté**,
- **2 types de paysage**, dont éventuellement un paysage **bloquant** (une forêt, par exemple) que la voiture ne peut pas traverser.

Une tuile porte un type de piste, un type de bas-côté et un type de paysage, chacun pris dans la palette de son environnement. Ces types déterminent l'adhérence et la rugosité de chaque zone.

Une tuile est **transposable** d'un environnement à l'autre : sa géométrie ne change pas, seuls changent les grips et l'apparence. Le type « piste 2 » d'Europe et le type « piste 2 » d'Afrique sont des revêtements différents à la même place dans la palette. Une piste dessinée en Europe se joue donc en Afrique sans être redessinée.

<TODO> Lister les trois pistes, trois bas-côtés et deux paysages de chaque environnement, et pour chacun ce que le joueur doit ressentir. Le POC 1 sert précisément à trouver ces valeurs.

### 2.3 Relief

Le relief se joue uniquement par la hauteur des tuiles et les obstacles.

- Deux tuiles consécutives se raccordent à la même hauteur (voir 2.6). Le changement de hauteur se fait **au milieu de la tuile** : la moitié d'entrée est à la hauteur d'entrée, la moitié de sortie à la hauteur de sortie, et une pente les relie.
- Les sauts se font sur des **rampes** et des **dos d'âne** posés comme obstacles sur la piste, pas par le relief des tuiles.

<CHOIX> Différence de hauteur maximale entre l'entrée et la sortie d'une même tuile. Une pente trop raide en huit unités devient un mur ; à mesurer dans le POC 2.

### 2.4 Habillage d'une tuile

Un obstacle est un **bloc** qui occupe **X unités de large** dans le modèle de données de la tuile, placé **le long du tracé de la piste**. Son modèle physique peut être plus petit que son emprise dans les données : une rambarde est plus étroite qu'un talus de neige, mais les deux réservent la même place.

| Élément   | Où                                                              | Effet                                               |
|-----------|-----------------------------------------------------------------|-----------------------------------------------------|
| Barrière  | Le long de la piste, remplace le bas-côté, optionnelle par côté | Bloque, collision avec dégâts                       |
| Rampe     | Sur la piste                                                    | Fait décoller                                       |
| Dos d'âne | Sur la piste                                                    | Fait sauter légèrement, déstabilise à haute vitesse |
| Hazard    | Sur la piste ou le bas-côté                                     | Obstacle à éviter, collision avec dégâts            |

Exemples de hazards : balle de foin, véhicule en panne, rocher, tas de troncs. L'environnement décide de l'apparence de chaque élément : une barrière est une rambarde en Europe, un talus de neige dans le Nord.

Il n'y a **aucun décor** hors des tuiles : le monde se limite aux hexagones, éclairés par une lumière d'ambiance. Le paysage d'une tuile (voir 2.2) est ce qu'on voit au-delà du bas-côté.

<TODO> Lister les hazards par environnement et leur emprise en unités.

### 2.5 Tuiles spéciales

Deux seulement : **départ** et **arrivée**. Pas de checkpoint, pas de ligne de secteur, pas de zone de respawn dédiée (le respawn se fait sur la dernière tuile parcourue, voir 3.8).

En mode Track, la tuile de départ porte aussi la ligne d'arrivée.

### 2.6 Règles d'assemblage

Deux tuiles s'enchaînent si la face de sortie de la première et la face d'entrée de la seconde portent exactement le **même profil** :

- même largeur et même position de piste et de bas-côtés,
- même hauteur,
- mêmes types de piste, de bas-côté et de paysage.

Tout changement se fait au milieu d'une tuile, jamais à la jonction. Une tuile est donc un « connecteur » entre un profil d'entrée et un profil de sortie.

Une piste est une **liste ordonnée de tuiles** : chaque tuile suit la précédente, et sa position dans l'espace se déduit de la liste. Il faut donc **interdire trop de virages serrés consécutifs** pour que la piste ne se recoupe pas (voir 5.5).

### 2.7 Hors piste et limites du monde

- **Quitter la piste** n'est pas une faute : on roule sur le bas-côté puis dans le paysage, avec le grip correspondant, et on revient. Un paysage bloquant arrête la voiture comme un mur.
- **Sortir de l'hexagone** (tomber du terrain) :
  - en **Track** et **Rally**, la voiture est remise immédiatement au centre de la dernière tuile parcourue, à l'arrêt ;
  - en **Collapse**, la partie est perdue.

---

## 3. La voiture et sa conduite

### 3.1 Le véhicule

Plusieurs voitures, **customisables**, pour porter une progression : des voitures et des améliorations à débloquer avec des crédits gagnés en course (voir 6.2).

Progression prévue :

1. **Une seule voiture de départ**, basse en tout : peu puissante, peu maniable, peu robuste.
2. Puis une **petite voiture maniable**, genre R5 Turbo ou Golf GTI.
3. Puis une **berlinette** genre Alpine, plus puissante et plus maniable encore.

<TODO> Caractéristiques chiffrées (vitesse, accélération, maniabilité, robustesse) et améliorations achetables.

### 3.2 Ressenti de conduite

Arcade, sans être basique. Après dix secondes le joueur doit sentir trois choses : **la glisse**, **la différence entre deux revêtements**, et **les suspensions** qui travaillent sur les bosses et les atterrissages.

### 3.3 Commandes

Actions : accélérer, freiner / marche arrière, tourner, frein à main, reset (maintenu trois secondes, voir 3.8). Pas de contrôle de caméra.

**Manette** (le mode de référence, analogique) :

| Action                   | Commande        |
|--------------------------|-----------------|
| Accélérer                | Gâchette droite |
| Freiner / marche arrière | Gâchette gauche |
| Tourner                  | Stick droit     |
| Frein à main             | L1 ou R1        |
| Reset                    | Y               |
| Menus : naviguer         | Stick droit     |
| Menus : valider          | Accélérer       |
| Menus : retour           | Freiner         |

**Clavier** (PC, on accepte la perte de l'analogique) :

| Action                      | Commande        |
|-----------------------------|-----------------|
| Accélérer, freiner, tourner | WASD ou flèches |
| Frein à main                | Espace          |
| Reset                       | R               |
| Menus : retour              | Échap           |

**Tactile** (mobile) :

- un **palonnier vertical à gauche** pour accélérer et freiner,
- un **palonnier horizontal à droite** pour la direction,
- un **bouton au milieu** pour le frein à main,
- menus au toucher.

### 3.4 Comportement par surface

C'est le cœur du POC 1. Le principe : **chaque surface impose une manière de prendre les virages**.

- Sur **asphalte**, il est plus rapide d'éviter la glisse : on freine, on tourne, on réaccélère.
- Sur **sable et gravier**, éviter la glisse est impossible : les virages se prennent en dérapage.
- Une **épingle** doit se passer efficacement au frein à main, quelle que soit la surface.

<TODO> Neige et glace : à définir, sans doute une glisse encore plus longue et un freinage très allongé.

<TODO> Pour chaque type de piste, de bas-côté et de paysage : adhérence longitudinale, adhérence latérale, freinage, effet sur la vitesse de pointe, rugosité (ce qui secoue la voiture et la caméra).

### 3.5 Dérapage et frein à main

Le dérapage est un **outil de pilotage**, pas une punition. On l'engage par un coup de frein à main ou par un transfert de masse sur surface meuble, on le tient à l'accélérateur, on le rattrape au volant.

Si le joueur **abuse de la glisse, il part en tête-à-queue**. Il s'en sort en marche arrière : **le frein maintenu enfoncé une fois la voiture à l'arrêt** passe la marche arrière.

### 3.6 Sauts et comportement en l'air

**Pas de contrôle en vol**, ou un contrôle très léger. La trajectoire se décide avant la rampe : c'est ce qui rend les sauts intéressants.

<CHOIX> Voiture retournée : se remet seule sur ses roues après un court délai, ou reste sur le toit jusqu'au reset manuel.

<GPE> Reset manuel

### 3.7 Collisions

Collisions contre les obstacles, les barrières et les paysages bloquants. Elles produisent des **dégâts cosmétiques et pénalisants** :

- **Sur la voiture** : texture abîmée, déformation simple du modèle.
- **Dans le HUD** : un schéma de la voiture indique ce qui est abîmé.
- **Dans la conduite** : l'élément abîmé dégrade le comportement.

| Partie     | Effet quand elle est abîmée          |
|------------|--------------------------------------|
| Moteur     | Perte de vitesse                     |
| Suspension | Perte de stabilité                   |
| Direction  | La voiture tire à gauche ou à droite |
| Roue       | Glisse accrue                        |

Les dégâts sont **remis à zéro à chaque course**. Si un mode Campagne voit le jour (voir 4.6), ils deviendront persistants dans ce mode uniquement.

### 3.8 Réinitialisation

- **Reset manuel** : un bouton maintenu **trois secondes** remet la voiture au centre de la dernière tuile parcourue, dans le sens de la piste, à l'arrêt. Le chrono continue.
- **Sortie du terrain** : remise immédiate au centre de la dernière tuile, à l'arrêt, en Track et Rally. En Collapse, la partie est perdue.

### 3.9 Caméra

Vue **du dessus**, qui suit l'orientation de la voiture. Sa **hauteur varie avec la vitesse** : plus on va vite, plus on voit loin. Elle pourra s'orienter légèrement vers la prochaine tuile pour aider à anticiper.

---

## 4. Modes de jeu

### 4.1 Tronc commun

- Compte à rebours **3, 2, 1, GO** au départ.
- Un **chrono** tourne pendant toute la partie.
- **Pas de pause** : une partie dure moins de cinq minutes, on la finit ou on la quitte.
- Un **écran de fin** (voir 4.5).
- Dans tous les modes, seules les tuiles autour du joueur sont affichées (voir 9.2).

### 4.2 Mode Track (boucle)

Une piste fermée, **deux ou trois tours** au plus pour rester court. Le score est le **chrono total**. Pas de chrono au tour, pas de fantôme.

### 4.3 Mode Rally (point à point)

Un départ, une arrivée distincte. Le score est le **chrono total**. Pas de secteurs, pas de temps intermédiaires, pas de fantôme.

### 4.4 Mode Collapse

La piste est **générée procéduralement** (voir 5.3) et n'a pas de fin.

- La piste **apparaît devant** la voiture, avec X tuiles d'avance sur la position courante.
- Elle **disparaît derrière**, à Y tuiles du joueur.
- Un **rythme minimum** avance le front de disparition. Si le joueur va plus vite, la piste suit son rythme. S'il va moins vite, il voit le terrain disparaître derrière lui et se rapprocher.
- Le rythme est **lent au début et augmente** jusqu'à dépasser la vitesse de pointe des voitures en ligne droite : la fin est inévitable, au bout de **cinq minutes au maximum**.
- La partie est perdue quand la piste se dérobe sous la voiture ou quand la voiture sort du terrain.
- Le score est le **temps tenu**.

Le HUD porte un indicateur du front de disparition (voir 7.2).

<TODO> Fixer X, Y et la courbe du rythme dans le POC 2, une fois les vitesses des voitures connues.

### 4.5 Fin de partie et résultats

Une **boîte de dialogue** avec le score : le chrono en Track et Rally, le temps tenu en Collapse. Deux boutons : **Retry** et **Home**. Rien d'autre.

### 4.6 Modes envisagés mais hors v1

Par ordre d'arrivée probable :

1. **Défi quotidien** : le mode Collapse sur une piste aléatoire nouvelle chaque jour, la même pour tout le monde.
2. **Campagne / Tournoi** : une succession d'épreuves avec une voiture choisie au départ, améliorable entre deux épreuves, et des **dégâts persistants** d'une épreuve à l'autre.
3. Après l'ajout d'une IA : **Race**, une boucle contre trois bots, le premier à finir X tours gagne.
4. Après l'IA aussi : **Collapse en groupe**, où le but est de faire sortir les autres de la piste ; le dernier en jeu gagne.
5. **Multijoueur** en ligne, bien plus tard.

---

## 5. Pistes et contenu

### 5.1 Pistes livrées avec le jeu

Par environnement : **trois pistes Track** (boucles) et **trois pistes Rally** (lignes). **Toutes ouvertes** dès le départ : la progression est dans les voitures, pas dans les pistes.

### 5.2 Éditeur de pistes

Un éditeur **accessible à tous**, mais **PC uniquement** (clavier et souris).

- L'éditeur s'ouvre avec la seule **tuile de départ**, dont on configure le profil : types de piste, de bas-côté et de paysage, largeurs, position.
- On **ajoute une tuile uniquement en sortie de la dernière** tuile posée. Son profil d'entrée est **figé** au profil de sortie de la précédente ; on ne configure que sa face de sortie, la position et la largeur de la piste en sortie, la déclivité, les types de revêtement en sortie et les obstacles.
- On ne peut **supprimer que la dernière tuile**.
- On teste la piste et on la **sauvegarde dans le stockage local** pour y jouer ensuite.

L'éditeur affiche toutes les tuiles de la piste en même temps, contrairement au jeu qui n'en affiche qu'une fenêtre (voir 9.2).

### 5.3 Génération procédurale

Uniquement pour le mode Collapse.

Sur le modèle de la forge de hexact : une **graine** (seed) et quelques **cadrans** tiennent dans une seule chaîne et définissent le caractère de la piste : plutôt tournante ou plutôt droite, environnement, ampleur des déclivités, densité d'obstacles. La même chaîne rend toujours la même piste, ce qui rend le défi quotidien possible.

Le générateur procède **comme l'éditeur** : il ajoute une tuile après l'autre à partir de la précédente, en tirant chaque paramètre de la graine, dans le respect de 2.6 et 5.5. Il produit donc toujours une piste jouable.

Le **nombre de tuiles** à générer se déduit de la distance que parcourt la voiture la plus rapide du jeu en ligne droite pendant la durée maximale d'une partie.

<TODO> Ce qui rend une piste générée intéressante : alternance droites et virages, variation de largeur, fréquence des obstacles, progression de difficulté avec le temps.

### 5.4 Format et partage de pistes

Sur le modèle de hexact : une piste est **un fichier texte lisible à la main**, avec un en-tête qui nomme le format et sa version, des paires clé/valeur (identifiant, nom, environnement, mode), puis la **liste ordonnée des tuiles** avec leurs paramètres.

Contrairement à hexact, où un plateau connaît la position de chaque case, une piste HexRace ne stocke aucune position : chaque tuile suit la précédente, et sa place dans l'espace se calcule à la lecture.

Une piste livrée avec le jeu, une piste faite dans l'éditeur et une piste générée pour le Collapse sont **le même objet**.

**Pas de partage entre joueurs dans un premier temps.** Une piste éditée est sauvegardée dans le stockage local du navigateur.

### 5.5 Validité d'une piste

Les contraintes sur les tuiles et leur succession (2.6) rendent jouable toute piste qui les respecte. Valider une piste, c'est vérifier :

- que chaque jonction respecte 2.6,
- qu'il y a un départ et une arrivée,
- que la piste **ne se recoupe pas** : un nombre limité de virages serrés consécutifs, et aucune tuile posée sur une tuile existante,
- en mode Track, que la piste se referme sur son départ.

---

## 6. Progression et rejouabilité

### 6.1 Chronos et records locaux

Le meilleur chrono de chaque piste et le meilleur temps tenu en Collapse sont mémorisés.

### 6.2 Objectifs et récompenses

Un système de **crédits** gagnés en course et dépensés en voitures et améliorations. **Pas de médailles.**

Pour commencer, les crédits sont **illimités** : le barème gain par course / coût des voitures se calibrera en jouant.

### 6.3 Fantômes

Non.

### 6.4 Sauvegarde

Tout est dans le **stockage local du navigateur** pour commencer : chronos, voitures, améliorations, crédits, pistes éditées. Une sauvegarde côté serveur viendra peut-être plus tard.

---

## 7. Interface et parcours du joueur

### 7.1 Écrans

Sur le modèle de hexact pour la structure et l'enchaînement.

```
Home ─┬─ Track ─── choix environnement ─── choix piste ─── Course ─── Résultats ─┬─ Retry
      ├─ Rally ─── choix environnement ─── choix piste ─── Course ─── Résultats ─┤
      ├─ Collapse  choix environnement ────────────────── Course ─── Résultats ─┴─ Home
      ├─ Garage (voitures, améliorations, crédits)
      ├─ Éditeur (PC uniquement)
      └─ Options
```

### 7.2 HUD en course

Affiché :

- vitesse,
- régime moteur,
- rapport engagé,
- état de la voiture (schéma des dégâts),
- chrono courant,
- en Collapse, l'indicateur du front de disparition.

Refusé : mini-carte, secteurs, indicateur d'adhérence. On lit la surface à l'image.

### 7.3 Options

Volume, qualité graphique. Pas de remapping des commandes pour le moment.

### 7.4 Accessibilité

Rien de spécifique pour l'instant.

---

## 8. Direction artistique

### 8.1 Style visuel

Low poly. Textures pixelisées ou flat shading.

<CHOIX> Flat shading pur, ou textures pixelisées avec un post-traitement. À trancher en testant directement dans le POC 1, sur mobile, au niveau de performance visé.

### 8.2 Lisibilité des surfaces

Une surface se reconnaît par sa **couleur** et sa **texture**, sans légende. Les trois zones d'une tuile (piste, bas-côté, paysage) doivent se distinguer au premier coup d'œil.

### 8.3 Effets

Ce qui sert le gameplay, rien de plus :

- **Dérapage** : traces de pneus, poussière ou particules selon la surface, son.
- **Collision** : particules, son.

### 8.4 Ambiance

Rien hors des tuiles. Une lumière d'ambiance. Pas de météo.

### 8.5 Audio

- **Moteur** : le son dépend du régime, avec le **rupteur** en bout de rapport et les **claquements d'échappement** au changement de rapport.
- **Roulement** selon la surface.
- **Dérapage**, **collisions**, **retours d'interface**.
- **Pas de musique.**

---

## 9. Plateforme et contraintes

### 9.1 Cibles

Navigateurs récents sur PC et mobile.

### 9.2 Performance

30 images par seconde au minimum, sur mobile.

Dans tous les modes, **seules les tuiles autour du joueur sont affichées** : X tuiles devant, Y tuiles derrière, comme en Collapse mais sans disparition. Cela borne le nombre de polygones à l'écran quelle que soit la longueur de la piste.

### 9.3 Connexion

Entièrement hors ligne pour commencer.

### 9.4 Langue

Anglais uniquement, avec un texte minimaliste.

---

## 10. Périmètre et jalons

### 10.1 POC 1 : voiture sur terrain plat multi-surfaces

**Objectif** : trouver le ressenti de conduite et les valeurs de grip par surface, à la manette.

**Ce qu'on doit pouvoir faire** : rouler sur un terrain plat découpé en zones de surfaces différentes, avec au moins asphalte, gravier et glace, et quelques barrières. Essayer les deux rendus de 8.1.

**Validé quand** :

- on sent la différence entre deux surfaces sans regarder le sol,
- une épingle se passe au frein à main,
- sur asphalte, glisser fait perdre du temps ; sur gravier, ne pas glisser en fait perdre,
- abuser de la glisse envoie en tête-à-queue et on s'en sort en marche arrière,
- les suspensions se voient et se sentent,
- ça tourne à 30 images par seconde dans un navigateur mobile, avec les commandes tactiles de 3.3.

<TODO> Compléter les critères après les premiers essais.

### 10.2 POC 2 : construction d'un terrain hexagonal

**Objectif** : valider le modèle de tuile paramétrée et les règles d'assemblage.

**Ce qu'on doit pouvoir faire** : décrire une piste dans un fichier texte, la voir apparaître, la parcourir avec la voiture du POC 1. Générer une suite de tuiles à partir d'une graine, respectant 2.6 et 5.5.

**Validé quand** :

- toute suite de tuiles respectant 2.6 se raccorde sans couture visible ni accroc à la conduite,
- une piste fermée se referme sur elle-même,
- les changements de largeur, de position, de hauteur et de type au milieu d'une tuile se conduisent bien,
- une sortie légère sur le bas-côté à la jonction de deux tuiles ne fait pas tomber du terrain,
- la taille de tuile (8 unités par côté) et la hauteur maximale par tuile sont confirmées ou corrigées,
- la fenêtre d'affichage (X devant, Y derrière) ne se voit pas depuis la caméra.

### 10.3 MVP : première version jouable

**Un environnement, une voiture, une piste**, en mode Track. Avec le compte à rebours, le chrono, l'écran de résultats et la sauvegarde du meilleur temps. Sans garage, sans éditeur, sans Rally ni Collapse.

### 10.4 Après le MVP

Par ordre d'envie :

1. Les deux autres pistes Track, puis les trois Rally.
2. Mode Collapse et générateur.
3. Garage, crédits, voitures et améliorations.
4. Deuxième et troisième environnements.
5. Éditeur.
6. Défi quotidien.
7. Campagne / Tournoi.
8. IA et mode Race.
9. Collapse en groupe.
10. Multijoueur.

---

## 11. Décisions et questions ouvertes

### 11.1 Registre des décisions

| Date       | Décision                                                                           | Raison                                                                      |
|------------|------------------------------------------------------------------------------------|-----------------------------------------------------------------------------|
| 2026-09-10 | TypeScript dans le navigateur, pas Godot                                           | Jouable sans installation, PC et mobile                                     |
| 2026-09-10 | Trois piliers : fun, simple, court                                                 | Départager toute décision de conception                                     |
| 2026-09-10 | Tuile définie par paramètres, jamais dessinée                                      | Assemblage garanti, génération procédurale possible                         |
| 2026-09-10 | Unité = une largeur de voiture ; côté d'hexagone = 8 unités                        | Marge de bas-côté aux jonctions, au moins 1 unité de paysage de chaque côté |
| 2026-09-10 | Côté plat vers l'avant                                                             | Une face devant, une derrière, cohérent avec une piste qui traverse         |
| 2026-09-10 | Une piste est une liste ordonnée de tuiles, sans positions                         | Format simple, l'éditeur et le générateur travaillent pareil                |
| 2026-09-10 | Changements de profil au milieu de la tuile                                        | Jonctions toujours identiques des deux côtés                                |
| 2026-09-10 | Par environnement : 3 pistes, 3 bas-côtés, 2 paysages                              | Palette bornée, tuiles transposables                                        |
| 2026-09-10 | Pas de checkpoint, pas de secteurs, pas de fantôme, pas de pause, pas de médailles | Parties courtes, écrans minimaux                                            |
| 2026-09-10 | Dégâts visibles et pénalisants, remis à zéro à chaque course                       | Référence Wreckfest ; persistance réservée à une future Campagne            |
| 2026-09-10 | Pas de contrôle en vol                                                             | Les sauts se préparent avant la rampe                                       |
| 2026-09-10 | Caméra du dessus dont la hauteur suit la vitesse                                   | Voir plus loin quand on va vite                                             |
| 2026-09-10 | Troisième mode nommé Collapse                                                      | Dit ce qui se passe, distinctif                                             |
| 2026-09-10 | Score Collapse = temps tenu, pas nombre de tuiles                                  | Plus lisible pour le joueur                                                 |
| 2026-09-10 | Pistes toutes ouvertes, progression par les voitures                               | Une seule dimension de progression                                          |
| 2026-09-10 | Crédits illimités au départ                                                        | Calibrer en jouant                                                          |
| 2026-09-10 | Pas de partage de pistes en v1                                                     | Stockage local seulement                                                    |
| 2026-09-10 | MVP = 1 environnement, 1 voiture, 1 piste Track                                    | Le plus court chemin vers une partie complète                               |
| 2026-09-10 | Anglais uniquement, texte minimaliste                                              | Un seul jeu de textes à maintenir                                           |
| 2026-09-10 | Pas de musique                                                                     | Le son sert la conduite                                                     |

### 11.2 Questions ouvertes

| Réf. | Question                                                                                                                                                                                                                                                                                                                                    |
|------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 2.1  | Nommage des faces : heures d'horloge (12, 2, 4, 6, 8, 10) ou points cardinaux (N, NE, SE, S, SW, NW). Les heures se manipulent comme des nombres (un virage à 60° est un écart de 2, la face opposée un écart de 6) et s'écrivent en deux caractères ; les cardinaux se lisent mieux mais ne se calculent pas. Recommandation : les heures. |
| 2.3  | Différence de hauteur maximale dans une tuile                                                                                                                                                                                                                                                                                               |
| 3.6  | Voiture retournée : remise automatique ou reset manuel                                                                                                                                                                                                                                                                                      |
| 8.1  | Flat shading ou textures pixelisées avec post-traitement, à tester dans le POC 1                                                                                                                                                                                                                                                            |

---

## Annexes

### A. Glossaire

- **Unité** : une largeur de voiture. Toutes les dimensions d'une tuile se comptent en unités.
- **Tuile / hexagone** : unité de construction d'une piste, 8 unités de côté, définie par ses paramètres.
- **Face** : un des six côtés d'une tuile, nommé par une heure d'horloge. La piste entre par la face 6 et sort par une autre.
- **Profil** : sur une face, la largeur, la position, la hauteur et les types de piste, de bas-côté et de paysage. Deux tuiles s'enchaînent si leurs profils coïncident.
- **Piste** : la partie roulante de la tuile, de 1 à 5 unités de large.
- **Bas-côté** : 0 ou 1 unité de chaque côté de la piste, avec son propre grip.
- **Paysage** : le reste de la tuile, au moins 1 unité de chaque côté, avec son propre grip, éventuellement bloquant.
- **Environnement** : un thème (Nord, Europe, Afrique) qui fixe la palette de surfaces et l'habillage des obstacles.
- **Déclivité** : différence entre la hauteur de sortie et la hauteur d'entrée d'une tuile.
- **Obstacle** : un bloc de X unités posé le long de la piste : barrière, rampe, dos d'âne, hazard.
- **Graine** : la chaîne qui définit entièrement une piste générée.
- **Front de disparition** : en Collapse, la limite derrière la voiture au-delà de laquelle la piste n'existe plus.
- **Reset** : remise de la voiture au centre de la dernière tuile parcourue.

### B. Croquis et schémas

Les schémas sont dans [`docs/croquis.html`](croquis.html), une page autonome à ouvrir dans un navigateur :

1. Grille côté plat vers l'avant et nommage des faces par heures d'horloge (2.1).
2. Les cinq traversées possibles : sortie 12, 2, 4, 10 ou 8 (2.1).
3. Le profil d'une face en huit unités : paysage, bas-côté, piste, bas-côté, paysage (2.1).
4. Une tuile vue de dessus et en coupe, avec changement de largeur, de position et de hauteur au milieu (2.3, 2.6).
5. Une boucle de douze tuiles sans aucune position écrite (2.6, 5.4).
6. Le fichier de piste qui décrit cette boucle ; sa syntaxe est illustrative et sera fixée par la spécification technique (5.4).
