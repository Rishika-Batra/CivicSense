export default {
  testEnvironment: 'node',
  testMatch: ['**/dist/tests/**/*.test.js'],
  verbose: true,
  // Runs before test framework is installed but after test environment is set up.
  // This is a module file (not a global setup file), so it runs in the same
  // context as the tests, guaranteeing env is set before any import side effects.
  setupFiles: ['./jest.setup.js'],
}
