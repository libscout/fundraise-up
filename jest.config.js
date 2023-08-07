const { config } = require("dotenv-safe");

config();

module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  testTimeout: 60000,
  rootDir: ".",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": "ts-jest",
  },
  collectCoverageFrom: ["**/*.(t|j)s"],
  coverageDirectory: "./coverage",
  testEnvironment: "node",
};
