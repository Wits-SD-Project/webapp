// frontend/src/__mocks__/firebase.js (Create this directory and file)

// Mock specific services you use, e.g., auth and firestore
export const getAuth = jest.fn(() => ({
  // Mock auth object properties/methods needed
  currentUser: null,
  signInWithEmailAndPassword: jest.fn(() =>
    Promise.resolve({ user: { uid: "test-uid", email: "test@example.com" } })
  ),
  createUserWithEmailAndPassword: jest.fn(() =>
    Promise.resolve({ user: { uid: "new-uid", email: "new@example.com" } })
  ),
  sendPasswordResetEmail: jest.fn(() => Promise.resolve()),
  signOut: jest.fn(() => Promise.resolve()),
  onAuthStateChanged: jest.fn((callback) => {
    // Simulate initial state (logged out)
    // You might call callback(null) immediately or based on test setup
    // Return an unsubscribe function
    return jest.fn(); // Mock unsubscribe
  }),
}));

export const getFirestore = jest.fn(() => ({
  // Mock Firestore methods needed
  collection: jest.fn(() => ({
    doc: jest.fn(() => ({
      get: jest.fn(() =>
        Promise.resolve({
          exists: () => true,
          data: () => ({ role: "resident" }),
          id: "test-doc",
        })
      ),
      set: jest.fn(() => Promise.resolve()),
      update: jest.fn(() => Promise.resolve()),
      delete: jest.fn(() => Promise.resolve()),
    })),
    add: jest.fn(() => Promise.resolve({ id: "new-doc-id" })),
    where: jest.fn(() => ({
      // Mock query methods if used
      get: jest.fn(() =>
        Promise.resolve({
          empty: false,
          docs: [{ id: "q-doc-1", data: () => ({ name: "Facility A" }) }],
        })
      ),
    })),
    get: jest.fn(() =>
      Promise.resolve({
        // Mock simple collection get
        empty: false,
        docs: [{ id: "coll-doc-1", data: () => ({ name: "Facility B" }) }],
      })
    ),
  })),
  doc: jest.fn((db, path) => ({
    // Mock top-level doc function
    get: jest.fn(() =>
      Promise.resolve({
        exists: () => true,
        data: () => ({ some: "data" }),
        id: path.split("/").pop(),
      })
    ),
    set: jest.fn(() => Promise.resolve()),
    // ... other doc methods
  })),
  // Add other Firestore functions you use (query, where, orderBy, etc.)
}));

// Mock other Firebase services/functions as needed (e.g., initializeApp)
export const initializeApp = jest.fn();

// You might need to mock specific functions directly if not part of a service
export const collection = jest.fn();
export const doc = jest.fn();
export const getDoc = jest.fn(() =>
  Promise.resolve({ exists: () => true, data: () => ({ mock: "data" }) })
);
export const setDoc = jest.fn(() => Promise.resolve());
// ... etc.
