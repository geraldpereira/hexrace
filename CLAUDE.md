# HexRace - comment travailler dans ce dépôt

Rally arcade sur tuiles hexagonales, dans le navigateur, manette et tactile. Ce fichier dit comment
*coder* ici ; il ne raconte pas l'architecture et ne répète rien qu'un autre fichier dit déjà.

## Où regarder

| Question | Où c'est répondu |
| --- | --- |
| Qu'est-ce que le jeu, pour le joueur ? | `docs/specs-fonctionnelles.md` |
| Comment est-il construit, qui possède quoi ? | `docs/specs-techniques.md` |
| Dans quel ordre, et quand un module est-il fini ? | `docs/plan-de-construction.md` |
| Qu'est-ce que je peux lancer ? | `make`, qui liste chaque cible avec sa phrase |
| À quoi sert ce module, que refuse-t-il ? | son `index.ts`, en cinq lignes |
| Qui a le droit de lire qui ? | `.dependency-cruiser.js`, une règle par ligne avec son argument |
| Quelles règles de lint, et pourquoi ? | `eslint.config.js` |
| Seuils de couverture, plafond de duplication ? | chaque `packages/*/vitest.config.ts`, `angular.json`, `.jscpd.json` |

## Commandes

Toujours par le Makefile : il épingle Node 24 via nvm, qu'Angular 22 exige et que le shell ambiant
n'a généralement pas. `make check` est le quotidien, toutes les portes puis toutes les suites ;
`make serve` sert l'application sur http://localhost:4300, `make serve-lan` l'expose à un téléphone.

## Les règles qui ne sont écrites nulle part ailleurs

- **DI Angular partout, pas de constructeur à paramètres.** Chaque classe d'un package est un service
  `@Injectable({ providedIn: 'root' })` qui obtient ses dépendances par `inject()`. Les tests passent
  par `TestBed` et remplacent des jetons. Le lint le tient (`no-restricted-syntax` sur les
  constructeurs).
- **Un module, une vitrine.** Un module n'est fini que quand sa page `lab/<module>` tourne. La liste
  est dans `apps/web/src/app/lab/showcases.ts` ; on y passe `ready: true` quand la route existe.
- **Le mot est « tile », jamais « hex ».** En anglais, *hex* est aussi une malédiction.
- **On se lit par son nom.** `@hexrace/<package>` pour un voisin, `@<package>/*` chez soi, `@ui/*` dans
  l'app. Jamais de chemin relatif : le lint refuse `./` et `../`.
- **Français dans les commentaires et les commits, anglais dans le code.** Identifiants, noms de
  fichiers et libellés du lab en anglais ; ce qui explique est en français.
- **`poc/` n'est pas le jeu.** Matière première à reprendre module par module ; rien ne l'importe.

## Les modules

```
packages/inputs/   @hexrace/inputs - les entrées : actions, manette / clavier / tactile, fusion.
apps/web/          @hexrace/web    - l'application Angular 22 : le lab des vitrines, puis le jeu.
```

Un package ajouté se déclare dans `make/quality.mk` (PROJECTS), `eslint.config.js` (project),
`knip.json` (workspaces), les `paths` de `apps/web/tsconfig.json`, et ici.
