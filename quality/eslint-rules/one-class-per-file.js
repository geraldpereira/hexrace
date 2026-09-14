// @ts-check

import { basename } from 'node:path';

/**
 * A file holds one class and is named after it, in kebab-case: `TileSweeper` lives in
 * `tile-sweeper.ts`. What a reader sees in the tree is what they will find inside, and a service
 * is found by its name without a search. Specs and mocks are not checked; abstract classes are.
 */
/** @param {string} name */
const kebab = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/** @type {import('eslint').Rule.RuleModule} */
export const oneClassPerFile = {
  meta: {
    type: 'suggestion',
    docs: { description: 'One class per file, the file named after the class.' },
    schema: [],
    messages: {
      several: 'This file declares {{count}} classes; a file holds one class, named after it.',
      misnamed:
        'Class {{name}} belongs in a file called {{expected}}.ts, not {{actual}}: a file is named ' +
        'after the class it holds.',
    },
  },
  create(context) {
    if (/\.(spec|mock)\.ts$/.test(context.filename)) return {};
    /** @type {import('estree').ClassDeclaration[]} */
    const classes = [];
    return {
      ClassDeclaration(node) {
        classes.push(node);
      },
      'Program:exit'(program) {
        if (classes.length > 1) {
          context.report({
            node: program,
            messageId: 'several',
            data: { count: String(classes.length) },
          });
          return;
        }
        const only = classes[0];
        if (!only?.id) return;
        const actual = basename(context.filename, '.ts');
        const expected = kebab(only.id.name);
        if (actual !== expected) {
          context.report({
            node: only.id,
            messageId: 'misnamed',
            data: { name: only.id.name, expected, actual },
          });
        }
      },
    };
  },
};
