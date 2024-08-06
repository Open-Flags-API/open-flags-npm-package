module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    transform: {
      '^.+\\.tsx?$': 'ts-jest',
      '^.+\\.jsx?$': 'babel-jest',
      '^.+\\.svg$': 'jest-transform-stub'
    },
    testMatch: ['**/__tests__/**/*.test.ts']
  };
  