// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const simpleImportSort = require('eslint-plugin-simple-import-sort');

module.exports = defineConfig([
  expoConfig,
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            // React + RN core
            ['^react$', '^react-native$', '^react', '^react-native/'],
            // Third-party
            ['^@?\\w'],
            // Internal @/ aliases
            ['^@/theme', '^@/store', '^@/api', '^@/hooks', '^@/components', '^@/utils', '^@/types', '^@/'],
            // Relative
            ['^\\.'],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
      'no-console': 'warn',
      'import/no-named-as-default-member': 'off',
    },
  },
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*', 'expo-env.d.ts'],
  },
]);
