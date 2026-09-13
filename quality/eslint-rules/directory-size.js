// @ts-check

import { readdirSync } from 'node:fs';
import { dirname, sep } from 'node:path';

/**
 * A directory is a module, and a module you cannot take in at a glance is a list.
 *
 * Two names and one implementation, because a rule cannot choose its own severity: the warning
 * covers `over + 1 … upTo` and the error above it. `over` is *more than*: 21 warns, 20 does not.
 */
/**
 * @param {{ over: number, upTo?: number }} thresholds
 * @returns {import('eslint').Rule.RuleModule}
 */
export const directorySize = ({ over, upTo = Infinity }) => {
  const seen = new Set();

  return {
    meta: {
      type: 'suggestion',
      docs: { description: 'A directory holds few enough files to be read at a glance.' },
      schema: [],
      messages: {
        big:
          'This directory holds {{count}} files (over {{over}}). A module you cannot take in at a ' +
          'glance is a list: look for the modules inside it, each with its own barrel. Specs and ' +
          'mocks are not counted.',
      },
    },
    create(context) {
      const COUNTED = /\.(ts|html|scss)$/;
      const NOT_COUNTED = /\.(spec|mock)\.ts$/;

      return {
        Program(program) {
          const file = context.filename;
          if (!file.includes(`${sep}src${sep}`)) return;
          const directory = dirname(file);
          if (seen.has(directory)) return;
          seen.add(directory);

          const count = readdirSync(directory, { withFileTypes: true }).filter(
            (one) => one.isFile() && COUNTED.test(one.name) && !NOT_COUNTED.test(one.name),
          ).length;
          if (count <= over || count > upTo) return;

          context.report({
            node: program,
            messageId: 'big',
            data: { count: String(count), over: String(over) },
          });
        },
      };
    },
  };
};
