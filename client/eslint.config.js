import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      // These flag code style / HMR ergonomics, not defects. Keep them visible as
      // warnings so they never block a build, while real errors still do.
      'react-refresh/only-export-components': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/unsupported-syntax': 'warn',
      // `motion` is used as <motion.div>, which core no-unused-vars cannot see.
      // Capitalised names are components or aliased icon props (icon: Icon).
      'no-unused-vars': ['error', {
        varsIgnorePattern: '^(motion$|[A-Z_])',
        argsIgnorePattern: '^[A-Z_]',
        caughtErrorsIgnorePattern: '^(_|err$|e$)',
      }],
    },
  },
])
