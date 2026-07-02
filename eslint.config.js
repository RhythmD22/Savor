import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        Chart: 'readonly',
        process: 'readonly',
        console: 'readonly',
        localStorage: 'readonly',
        DOMParser: 'readonly',
        fetch: 'readonly',
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        AbortController: 'readonly',
        URL: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        structuredClone: 'readonly',
        Blob: 'readonly',
        FileReader: 'readonly',
        self: 'readonly',
        caches: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
        },
      ],
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',
      'prefer-const': 'warn',
      'eqeqeq': [
        'warn',
        'always',
        {
          null: 'ignore',
        },
      ],
      'curly': ['warn', 'multi-line'],
      'no-var': 'warn',
    },
  },
];