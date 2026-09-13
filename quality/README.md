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
