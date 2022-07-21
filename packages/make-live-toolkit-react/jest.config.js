/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  clearMocks: true,
  preset: "ts-jest",
  setupFilesAfterEnv: ["<rootDir>/setup-tests.ts"],
  testEnvironment: "jsdom",
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/dist/"],
};
