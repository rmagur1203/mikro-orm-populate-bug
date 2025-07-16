module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  testMatch: ["**/*.ts"],
  collectCoverageFrom: ["**/*.ts", "!**/node_modules/**"],
};
