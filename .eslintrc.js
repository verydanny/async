module.exports = {
  extends: [
    'plugin:@torpedus/typescript',
    'plugin:@torpedus/typescript-tsconfig-checking',
    'plugin:@torpedus/react',
    // 'plugin:@rentpath/eslint-plugin-rentpath/typescript-tsconfig-checking',
    // 'plugin:@rentpath/eslint-plugin-rentpath/react',
    'plugin:@torpedus/node',
    'plugin:@torpedus/jest',
    'plugin:@torpedus/prettier'
    // 'plugin:@rentpath/eslint-plugin-rentpath/jest',
    // 'plugin:@rentpath/eslint-plugin-rentpath/prettier'
  ],
  parserOptions: {
    project: [
      'test/tsconfig.eslint.json',
      'packages/tsconfig.json',
      'packages/tsconfig_base.json'
    ]
  },
  rules: {
    // ES6
    'callback-return': 'off',
    'func-style': 'off',
    'require-atomic-updates': 'off',

    // Jest
    'jest/valid-expect-in-promise': 'off',
    'jest/require-tothrow-message': 'off',

    // File resolution
    'import/extensions': 'off',
    'import/no-extraneous-dependencies': 'error',

    // JSX Ally
    'jsx-a11y/control-has-associated-label': 'off',

    // React
    'react/display-name': 'off',

    // Node
    'node/no-extraneous-require': 'off',

    // TypeScript
    '@typescript-eslint/no-unnecessary-type-arguments': 'off',
    '@typescript-eslint/no-unnecessary-condition': 'off',
    '@typescript-eslint/prefer-readonly': 'off',
    '@typescript-eslint/ban-types': 'off',
    '@typescript-eslint/unbound-method': 'off',
    '@typescript-eslint/no-misused-promises': 'off',
    '@typescript-eslint/await-thenable': 'off',

    // Prettier (IMPORTANT: Must be last)
    'prettier/prettier': [
      'error',
      {
        arrowParens: 'always',
        bracketSpacing: true,
        trailingComma: 'none',
        singleQuote: true,
        semi: false
      }
    ]
  }
}
