// frontend/src/__mocks__/firebase.js
const mockAuth = {
  currentUser: {
    uid: 'test-uid',
    email: 'test@example.com',
    getIdToken: jest.fn(() => Promise.resolve('mock-token'))
  },
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn((callback) => {
    callback({ uid: 'test-uid' }); // Simulate authenticated user
    return jest.fn(); // Return unsubscribe function
  })
};

const mockFirestore = {
  collection: jest.fn(() => ({
    doc: jest.fn(() => ({
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn()
    }))
  })),
  doc: jest.fn()
};

// Mock the modular Firebase functions
export const initializeApp = jest.fn(() => ({}));
export const getAuth = jest.fn(() => mockAuth);
export const getFirestore = jest.fn(() => mockFirestore);