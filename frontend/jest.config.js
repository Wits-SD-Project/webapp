export default {
  transform: {
    "^.+\\.jsx?$": "babel-jest",
  },
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
  },
  testEnvironment: "jsdom",
  transformIgnorePatterns: [
    "/node_modules/(?!(react-router-dom)/)", // <--- allow esm packages
  ],
  collectCoverageFrom: [
    "src/**/*.{js,jsx}", // Include all JS/JSX files in src
    "!src/index.js", // Exclude top-level index.js
    "!src/reportWebVitals.js", // Exclude generated files if any
    "!src/setupTests.js", // Exclude test setup
    "!src/**/__mocks__/**", // Exclude mocks
    // Add other exclusions as needed
  ],
};
