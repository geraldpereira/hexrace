# What the lint holds, and where each rule is argued

`eslint.config.js` says which rule runs where; the rules this repo wrote live in `eslint-rules/`,
one file each, argued in its own header. They are plain JS because ESLint loads a flat config with
no build step, and `tsconfig.json` here is what makes their `// @ts-check` mean anything:
`make quality-typecheck` runs it.

- **`hexrace/directory-size`**, taken from hexact, under two names because a rule cannot pick its
  own severity: `directory-getting-big` warns over 20 files (up to 30), `directory-too-big` errors
  over 30. A directory is a module, and a module you cannot take in at a glance is a list; specs and
  mocks are not counted.
- **`hexrace/comment-ration`**, taken from hexact. A comment is rationed by what it is attached to:
  a class or interface takes up to 5 lines, an entity 4, a public method 2, a public field or a type
  alias 1, a private member nothing, a barrel header 5. A function body takes no comment except a
  link to one of the three documents under `docs/`, or a word on a deliberately empty block. Specs
  take none. The argument: the name and the signature are what a reader has; prose that does not
  fit in the ration belongs in the header of the class or wants a better name.
- **`hexrace/one-class-per-file`**: a file in a package holds one class and is named after it in
  kebab-case, `TileSweeper` in `tile-sweeper.ts`. What a reader sees in the tree is what they find
  inside, and a service is found without a search. Specs and mocks are not checked.
- **`entity/` is data only** (plain `no-restricted-syntax` and `no-restricted-imports` blocks in
  `eslint.config.js`, argued in `docs/remise-d-aplomb-tile.md`): no function, class or decorator,
  no Angular, three or Jolt import. The data model stays inert and serialisable; the logic is a
  service somewhere else.
- **No module-level function in a package** (plain `no-restricted-syntax` selectors in
  `eslint.config.js`, argued in `docs/remise-d-aplomb-2.md`): a capability is a method of a
  service, a private helper a private method; the one exception is an Angular provider factory
  named `provide*`. Specs and mocks are not checked.
