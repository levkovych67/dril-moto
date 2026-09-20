import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.ts'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/*.ts', 'src/lcdui/**/*.ts', 'src/rms/**/*.ts', 'src/utils/**/*.ts'],
    rules: {
      'no-empty': 'off',
      'prefer-const': 'off',
      'no-self-assign': 'off',
    },
  },
])
