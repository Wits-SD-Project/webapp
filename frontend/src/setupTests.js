// frontend/src/setupTests.js
import "@testing-library/jest-dom";
// Mock react-toastify globally if used widely for notifications
jest.mock("react-toastify", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
  ToastContainer: jest.fn(() => null), // Mock the container component
}));

// Basic fetch mock (install jest-fetch-mock if needed: npm i --save-dev jest-fetch-mock)
// require('jest-fetch-mock').enableMocks();
// Or setup basic global fetch mock:
// global.fetch = jest.fn(() =>
//   Promise.resolve({
//     json: () => Promise.resolve({ mockData: true }),
//     ok: true,
//   })
// );

// You might need global mocks for localStorage/sessionStorage if used
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });
