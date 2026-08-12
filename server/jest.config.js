module.exports = {
    testEnvironment: 'node',
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    testMatch: ['<rootDir>/tests/**/*.test.js'],
    // The legacy end-to-end script needs a running server; it is invoked via
    // `npm run test:e2e`, not by Jest.
    testPathIgnorePatterns: ['/node_modules/', '<rootDir>/tests/e2e.js'],
    collectCoverageFrom: [
        'services/**/*.js',
        'controllers/**/*.js',
        'middleware/**/*.js',
        'utils/**/*.js',
        '!**/node_modules/**',
    ],
    coverageThreshold: {
        global: { statements: 55, branches: 40, functions: 55, lines: 55 },
    },
    testTimeout: 30000,
    // Surfaces handles that would otherwise keep the run alive.
    detectOpenHandles: false,
    forceExit: true,
    verbose: false,
};
