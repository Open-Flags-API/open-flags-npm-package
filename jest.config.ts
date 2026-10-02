module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.jsx?$': 'babel-jest',
    '^.+\\.svg$': '<rootDir>/jest/svg-transform.cjs' // SVG imports become data URIs, as in the build
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  // packages/* run their own Jest config (npm test runs them through the workspaces); dist/ holds the build.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/packages/'],
  modulePathIgnorePatterns: ['<rootDir>/dist/', '<rootDir>/packages/[^/]+/dist/']
};
