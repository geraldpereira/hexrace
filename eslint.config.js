// @ts-check
import eslint from '@eslint/js';
import angular from 'angular-eslint';
import sonarjs from 'eslint-plugin-sonarjs';
import tseslint from 'typescript-eslint';

/**
 * Ce que le lint tient, et pourquoi. Les règles maison de hexact (un export par fichier, pas de
 * fonction libre) ne sont pas reprises : ici la DI Angular est partout et la 3D impose des fichiers
 * d'assemblage. Ce qui est propre à HexRace tient en une règle : pas de paramètre de constructeur,
 * les dépendances viennent de `inject()` (plan de construction, 1.2).
 */
export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/.angular/**', '**/node_modules/**', '**/coverage/**', 'poc/**'],
  },

  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: [
          './packages/inputs/tsconfig.spec.json',
          './apps/web/tsconfig.app.json',
          './apps/web/tsconfig.spec.json',
        ],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
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
              message: 'Un module se lit par son nom : @inputs/*, @hexrace/inputs, @ui/*.',
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
    files: ['packages/*/src/**/*.ts', 'apps/web/src/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "MethodDefinition[kind='constructor'] > FunctionExpression[params.length>0]",
          message:
            "Pas de paramètre de constructeur : les dépendances viennent de inject(), et un test les remplace par TestBed.",
        },
      ],
    },
  },

  {
    files: ['apps/web/**/*.ts'],
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
    files: ['apps/web/**/*.html'],
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
    files: ['eslint.config.js', '**/vitest.config.ts', '.dependency-cruiser.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
