import js from '@eslint/js';
import tsParser from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';

export default [
  {
    ignores: ['dist', 'node_modules'],
  },
  js.configs.recommended,
  ...tsParser.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tsParser.parser,
      parserOptions: {
        project: 'tsconfig.json',
      },
    },
    plugins: {
      prettier: prettierPlugin,
      '@typescript-eslint': tsParser.plugin,
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  prettier,
];
