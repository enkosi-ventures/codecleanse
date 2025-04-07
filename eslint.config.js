// eslint.config.js (or .mjs)
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
// Import React plugins/configs directly
import reactRecommended from 'eslint-plugin-react/configs/recommended.js';
import reactJsxRuntime from 'eslint-plugin-react/configs/jsx-runtime.js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  // 1. Global ignores
  {
    ignores: [
      'dist/',
      'node_modules/',
      '.*.js', // Ignore top-level dotfiles like eslint.config.js if it's JS
      'vite.config.ts',
    ],
  },

  // 2. Base JS/TS recommendations
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // 3. Configuration for TypeScript Source Files (Type-Aware)
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      ...tseslint.configs.recommendedTypeChecked,
      // ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-misused-promises': 'error',
    },
  },

  // --- 4. React Configuration (Split into multiple objects) ---

  // 4a. Apply React recommended rules and settings to TSX files
  {
    files: ['src/**/*.{ts,tsx}'],
    // Apply the recommended configs directly
    ...reactRecommended,
    ...reactJsxRuntime, // Apply JSX runtime config
    settings: {
      react: {
        version: 'detect',
      },
      ...reactRecommended.settings, // Merge settings if needed
      ...reactJsxRuntime.settings,
    },
    rules: {
        // Merge rules from both configs and override
        ...reactRecommended.rules,
        ...reactJsxRuntime.rules,
        'react/prop-types': 'off', // Disable prop-types in TSX
        'react/react-in-jsx-scope': 'off', // Covered by jsx-runtime config
    }
  },

  // 4b. Apply React Hooks and Refresh plugins specifically
   {
      files: ['src/**/*.{ts,tsx}'], // Target the same files
      plugins: {
          'react-hooks': reactHooks,
          'react-refresh': reactRefresh,
      },
      rules: {
          ...reactHooks.configs.recommended.rules,
          'react-refresh/only-export-components': [
              'warn',
              { allowConstantExport: true },
          ],
      },
      languageOptions: {
          globals: {
              ...globals.browser, // Ensure browser globals are here too
          }
      }
   },

   // 5. Configuration for Web Workers
   {
    files: ['src/workers/**/*.worker.ts'],
    languageOptions: {
      globals: {
        ...globals.worker,
        'self': 'readonly',
      },
    },
    rules: {
        '@typescript-eslint/no-restricted-globals': 'off',
        // Avoid disabling no-undef if possible, rely on globals.worker
    }
   }
);