// @ts-check

/**
 * A comment is rationed by what it is attached to, and the ration is lines of text.
 *
 * Length a reader pays for twice buries the one sentence that mattered, and a count catches the
 * drift a review does not: nobody writes a forty-line header, they add a paragraph to a short one.
 */
/** @type {import('eslint').Rule.RuleModule} */
export const commentRation = {
  meta: {
    type: 'suggestion',
    docs: { description: 'A comment is no longer than what it is attached to allows.' },
    schema: [],
    messages: {
      over:
        'This comment is {{lines}} lines of text where {{cap}} allowed on {{what}}. A hook is 1 line ' +
        'and a short paragraph is 2 - see "Comments are rationed" in CLAUDE.md.',
      none:
        'No comment belongs on {{what}}. The name and the signature are what a reader has, and an ' +
        'argument that needs prose belongs in the header of the class or the module.',
      body:
        'The body of a function takes a comment only to link a spec (specs-fonctionnelles, ' +
        'specs-techniques, plan-de-construction), or to say why a block is deliberately empty. ' +
        'Anything else wants saying in the header, or wants a better name.',
    },
  },
  create(context) {
    /**
     * @typedef {{ line: number, column: number }} Spot
     * @typedef {{ type: string, range: [number, number], loc: { start: Spot, end: Spot } } &
     * Record<string, any>} Node
     * @typedef {{ type: 'Line' | 'Block', value: string, range: [number, number],
     * loc: { start: Spot, end: Spot } }} Note
     * @typedef {[Note, ...Note[]]} Group
     */

    const source = context.sourceCode;
    const file = context.filename.replaceAll('\\', '/');

    const DIRECTIVE = /^(?:eslint-|eslint\b|globals?\b|@ts-|prettier-ignore|v8 ignore|istanbul )/;
    const LINK = /specs-fonctionnelles|specs-techniques|plan-de-construction/;
    const IN_A_BODY = /Function|Method|Constructor/;

    const proseFree = /\.(?:spec|test|mock)\.ts$|\/test-fixtures\/|-builder\.ts$/.test(file);
    const ruleFile = /\/quality\/eslint-rules\//.test(file);
    const barrel = /\/index\.ts$/.test(file);
    const entity = /\/entity\/[^/]+\.ts$/.test(file) && !proseFree;

    const claimed = new Set();
    let barrelHeader = false;

    /** @param {Group} group */
    const linesOf = (group) =>
      group
        .flatMap((one) => one.value.split('\n'))
        .map((one) => one.replace(/^\s*\*?\s*/, '').trim())
        .filter((one) => one !== '' && !DIRECTIVE.test(one)).length;

    /** @param {Note} note */
    const alone = (note) =>
      (source.getLines()[note.loc.start.line - 1] ?? '').slice(0, note.loc.start.column).trim() === '';

    /**
     * @param {readonly Note[]} comments
     * @returns {Group[]}
     */
    const groups = (comments) => {
      /** @type {Group[]} */
      const made = [];
      for (const one of comments) {
        const last = made.at(-1)?.at(-1);
        const runs =
          last?.type === 'Line' &&
          one.type === 'Line' &&
          one.loc.start.line === last.loc.end.line + 1 &&
          alone(last) &&
          alone(one);
        if (runs === true) made.at(-1)?.push(one);
        else made.push([one]);
      }
      return made;
    };

    /**
     * @param {Group} group
     * @param {'over' | 'none' | 'body'} messageId
     * @param {{ cap?: number, name: string }} what
     */
    const report = (group, messageId, what) => {
      context.report({
        loc: { start: group[0].loc.start, end: (group.at(-1) ?? group[0]).loc.end },
        messageId,
        data: {
          lines: String(linesOf(group)),
          cap: messageId === 'over' ? `${what.cap} ${what.cap === 1 ? 'line is' : 'lines are'}` : '',
          what: what.name,
        },
      });
    };

    /**
     * @param {Node} node
     * @param {boolean} wrapped
     * @returns {Node}
     */
    const highest = (node, wrapped) => {
      /** @type {Node[]} */
      /** @type {Node[]} */
      const candidates = [node, node.decorators?.[0], wrapped ? node.parent : undefined].filter(
        (/** @type {Node | undefined | null} */ one) => one !== undefined && one !== null,
      );
      return candidates.reduce((one, other) => (other.range[0] < one.range[0] ? other : one), node);
    };

    /** @param {Node} node */
    const priv = (node) => node.accessibility === 'private' || node.key?.type === 'PrivateIdentifier';

    /** @param {Node} node */
    const holds = (node) =>
      node.declarations?.some((/** @type {Node} */ one) =>
        ['ArrowFunctionExpression', 'FunctionExpression'].includes(one.init?.type ?? ''),
      ) === true;

    /**
     * @param {Node} node
     * @param {boolean} isExported
     * @returns {{ cap: number, name: string }}
     */
    const ration = (node, isExported) => {
      if (ruleFile) return { cap: 3, name: 'one of this repo’s own lint rules' };

      switch (node.type) {
        case 'ClassDeclaration':
        case 'TSInterfaceDeclaration':
          return entity
            ? { cap: 4, name: 'an entity' }
            : { cap: 5, name: 'a class or an interface' };
        case 'TSTypeAliasDeclaration':
          return { cap: 1, name: 'a type alias' };
        case 'MethodDefinition':
        case 'TSMethodSignature':
          return priv(node)
            ? { cap: 0, name: 'a private method' }
            : { cap: 2, name: 'a public method' };
        case 'PropertyDefinition':
        case 'TSPropertySignature':
          return priv(node)
            ? { cap: 0, name: 'a private field' }
            : { cap: 1, name: 'a public field' };
        case 'FunctionDeclaration':
          return isExported
            ? { cap: 5, name: 'an exported function' }
            : { cap: 0, name: 'a private function' };
        case 'VariableDeclaration':
          if (!isExported) return { cap: 0, name: 'a private constant' };
          return holds(node)
            ? { cap: 5, name: 'an exported function' }
            : { cap: 1, name: 'a public constant' };
        default:
          return { cap: 0, name: 'this' };
      }
    };

    /** @param {Node} node */
    const check = (node) => {
      if (proseFree) return;
      const wrapped = node.parent?.type?.startsWith('Export') === true;
      const anchor = /** @type {import('estree').Node} */ (
        /** @type {unknown} */ (highest(node, wrapped))
      );
      const before = /** @type {Group} */ (source.getCommentsBefore(anchor));
      if (before.length === 0) return;

      for (const one of before) claimed.add(one);
      const allowed = ration(node, wrapped);
      for (const group of groups(before)) {
        const lines = linesOf(group);
        if (lines === 0) continue;
        if (lines > allowed.cap) report(group, allowed.cap === 0 ? 'none' : 'over', allowed);
      }
    };

    /** @type {Record<string, (node: Node) => void>} */
    const documentable = {};
    for (const type of [
      'ClassDeclaration',
      'TSInterfaceDeclaration',
      'TSTypeAliasDeclaration',
      'MethodDefinition',
      'TSMethodSignature',
      'PropertyDefinition',
      'TSPropertySignature',
      'FunctionDeclaration',
      'VariableDeclaration',
    ]) {
      documentable[type] = check;
    }

    return {
      ...documentable,

      /** @param {Node} node */
      'ExportNamedDeclaration, ExportAllDeclaration'(node) {
        if (proseFree || node.declaration !== null) return;
        const before = /** @type {Group} */ (
          source.getCommentsBefore(/** @type {import('estree').Node} */ (/** @type {unknown} */ (node)))
        );
        if (before.length === 0) return;

        for (const one of before) claimed.add(one);
        for (const group of groups(before)) {
          const lines = linesOf(group);
          if (lines === 0) continue;
          const first = barrel && !barrelHeader;
          barrelHeader = true;
          if (first && lines <= 5) continue;
          if (first) report(group, 'over', { cap: 5, name: 'a module barrel' });
          else report(group, 'none', { name: 'a re-export' });
        }
      },

      /** @param {Node} program */
      'Program:exit'(program) {
        /** @type {[number, number][]} */
        const bodies = [];
        /** @type {[number, number][]} */
        const empties = [];
        /** @param {unknown} thing */
        const walk = (thing) => {
          if (Array.isArray(thing)) {
            for (const one of thing) walk(one);
            return;
          }
          if (thing === null || typeof thing !== 'object') return;
          const node = /** @type {Node} */ (thing);
          if (typeof node.type !== 'string') return;
          if (node.type === 'BlockStatement') {
            if (IN_A_BODY.test(String(node.parent?.type ?? ''))) bodies.push(node.range);
            if (Array.isArray(node.body) && node.body.length === 0) empties.push(node.range);
          }
          for (const key of Object.keys(node)) {
            if (key !== 'parent') walk(node[key]);
          }
        };
        walk(program.body);

        for (const group of groups(/** @type {Group} */ (source.getAllComments()))) {
          if (group.some((one) => claimed.has(one)) || linesOf(group) === 0) continue;
          const at = group[0].range[0];
          if (empties.some(([from, to]) => at > from && at < to)) continue;
          if (bodies.some(([from, to]) => at > from && at < to)) {
            if (!group.some((one) => LINK.test(one.value))) report(group, 'body', { name: 'a body' });
            continue;
          }
          report(group, 'none', { name: proseFree ? 'a spec, a mock, a fixture or a builder' : 'this' });
        }
      },
    };
  },
};
