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
};
