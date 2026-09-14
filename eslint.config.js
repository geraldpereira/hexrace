// @ts-check
import eslint from '@eslint/js';
import angular from 'angular-eslint';
import sonarjs from 'eslint-plugin-sonarjs';
import tseslint from 'typescript-eslint';

import { commentRation } from './quality/eslint-rules/comment-ration.js';
import { directorySize } from './quality/eslint-rules/directory-size.js';
import { oneClassPerFile } from './quality/eslint-rules/one-class-per-file.js';

/**
 * Ce que le lint tient, et pourquoi. Pas de paramètre de constructeur, les dépendances viennent de
 * `inject()` (plan de construction, 1.2), sauf les objets-valeurs de `commons/math`. Dans les
 * packages, un fichier porte une classe et son nom (`hexrace/one-class-per-file`), et le sous-module
 * `entity/` n'est que de la donnée : ni fonction, ni classe, ni décorateur, ni Angular
 * (docs/remise-d-aplomb-tile.md, section 3).
 */
const NO_CONSTRUCTOR_PARAMS = {
  selector: "MethodDefinition[kind='constructor'] > FunctionExpression[params.length>0]",
  message:
    'Pas de paramètre de constructeur : les dépendances viennent de inject(), et un test les remplace par TestBed.',
};

/** Dans un package, une capacité est un service ; la seule fonction de module admise est un `provide*` Angular. */
const NO_MODULE_FUNCTIONS = [
  {
    selector:
      'Program > FunctionDeclaration:not([id.name=/^provide/]), Program > ExportNamedDeclaration > FunctionDeclaration:not([id.name=/^provide/])',
    message:
      'Pas de fonction au niveau du module dans un package : une capacité est une méthode d’un service (docs/remise-d-aplomb-2.md, section 3).',
  },
  {
    selector:
      'Program > VariableDeclaration > VariableDeclarator > :matches(ArrowFunctionExpression, FunctionExpression), Program > ExportNamedDeclaration > VariableDeclaration > VariableDeclarator > :matches(ArrowFunctionExpression, FunctionExpression)',
    message:
      'Pas de fonction au niveau du module dans un package : une capacité est une méthode d’un service (docs/remise-d-aplomb-2.md, section 3).',
  },
];

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/.angular/**', '**/node_modules/**', '**/coverage/**', 'poc/**'],
  },

  {
    files: ['**/*.ts'],
    plugins: {
      hexrace: {
        rules: {
          'comment-ration': commentRation,
          'directory-getting-big': directorySize({ over: 20, upTo: 30 }),
          'directory-too-big': directorySize({ over: 30 }),
          'one-class-per-file': oneClassPerFile,
        },
      },
    },
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: [
          './packages/commons/tsconfig.spec.json',
          './packages/inputs/tsconfig.spec.json',
          './packages/engine/tsconfig.spec.json',
          './packages/camera/tsconfig.spec.json',
          './packages/tile/tsconfig.spec.json',
          './packages/hud/tsconfig.spec.json',
          './apps/web/tsconfig.app.json',
          './apps/web/tsconfig.spec.json',
        ],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'hexrace/comment-ration': 'error',
      'hexrace/directory-getting-big': 'warn',
      'hexrace/directory-too-big': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['./*', '../*', '.', '..'],
              message: 'Reach a module by its name: @hexrace/<package>, @<package>/*, @ui/*.',
            },
          ],
        },
      ],
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
    },
  },

  { files: ['**/*.ts'], ...sonarjs.configs.recommended },
  {
    files: ['**/*.ts'],
    rules: { 'sonarjs/cognitive-complexity': ['error', 20] },
  },

  {
    files: ['apps/web/src/**/*.ts'],
    ignores: ['**/*.spec.ts', '**/*.mock.ts'],
    rules: { 'no-restricted-syntax': ['error', NO_CONSTRUCTOR_PARAMS] },
  },

  {
    files: ['packages/*/src/**/*.ts'],
    ignores: ['**/*.spec.ts', '**/*.mock.ts'],
    rules: {
      'hexrace/one-class-per-file': 'error',
      'no-restricted-syntax': ['error', NO_CONSTRUCTOR_PARAMS, ...NO_MODULE_FUNCTIONS],
    },
  },

  {
    files: ['packages/commons/src/math/vec2.ts', 'packages/commons/src/math/vec3.ts'],
    rules: { 'no-restricted-syntax': ['error', ...NO_MODULE_FUNCTIONS] },
  },

  {
    files: ['packages/*/src/entity/**/*.ts'],
    ignores: ['**/*.spec.ts', '**/*.mock.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'FunctionDeclaration, ArrowFunctionExpression, FunctionExpression',
          message: 'entity/ is data only: a function belongs to a service of another sub-module.',
        },
        {
          selector: 'ClassDeclaration, Decorator',
          message: 'entity/ is data only: interfaces, type aliases, enums and literal constants.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['./*', '../*', '.', '..'],
              message: 'Reach a module by its name: @hexrace/<package>, @<package>/*, @ui/*.',
            },
            {
              group: ['@angular/*', 'three', 'three/*', 'jolt-physics', 'lodash-es'],
              message: 'entity/ is data only: it imports its own package and @hexrace/commons.',
            },
          ],
        },
      ],
    },
  },

  {
    files: ['apps/web/**/*.ts', 'packages/hud/**/*.ts'],
    extends: [...angular.configs.tsRecommended],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      '@angular-eslint/component-selector': [
        'error',
        { type: ['element', 'attribute'], prefix: 'hr', style: 'kebab-case' },
      ],
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'hr', style: 'camelCase' },
      ],
    },
  },

  {
    files: ['apps/web/**/*.html', 'packages/hud/**/*.html'],
    extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
  },

  {
    files: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
      'max-lines': 'off',
      'max-lines-per-function': 'off',
    },
  },

  {
    files: ['eslint.config.js', '**/vitest.config.ts', '.dependency-cruiser.js', 'quality/**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
    rules: {
      'hexrace/comment-ration': 'off',
      'hexrace/directory-getting-big': 'off',
      'hexrace/directory-too-big': 'off',
    },
  },
);
