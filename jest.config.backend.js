// jest.config.backend.js
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node', // Correct for backend tests
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.m?[tj]sx?$': [
      'ts-jest',
      {
        useESM: true,
        // Point to the main tsconfig, as backend might not need/want tsconfig.jest.json overrides
        tsconfig: '<rootDir>/tsconfig.json' 
      },
    ],
  },
  transformIgnorePatterns: [
    // This pattern needs to be carefully managed for backend ESM dependencies
    '/node_modules/(?!(@t3-oss/env-nextjs|superjson)/).+\\.(m?js|ts)$' // From your testing_strategies.md
  ],
  // Ensure this targets only your backend tests
  testMatch: [
    '<rootDir>/tests/*.test.ts', // Added for tests directly in /tests
    '<rootDir>/tests/*.spec.ts', // Added for tests directly in /tests
    '<rootDir>/tests/server/**/*.test.ts',
    '<rootDir>/tests/server/**/*.spec.ts',
    // Add other backend test locations if necessary, e.g., specific to other subdirectories in /tests
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'mjs', 'json', 'node'],
}; 