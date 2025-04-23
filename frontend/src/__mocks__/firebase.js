// frontend/src/__mocks__/firebase.js

// --- AUTH ---
const mockAuthUser = {
  uid: "test-uid",
  email: "test@example.com",
  // Add other user properties if needed
};

const mockSignInWithEmailAndPassword = jest.fn(() =>
  Promise.resolve({ user: mockAuthUser })
);
const mockCreateUserWithEmailAndPassword = jest.fn(() =>
  Promise.resolve({ user: mockAuthUser })
);
const mockSendPasswordResetEmail = jest.fn(() => Promise.resolve());
const mockSignOut = jest.fn(() => Promise.resolve());
const mockOnAuthStateChanged = jest.fn((auth, callback) => {
  // Simulate user logged out initially, then logged in after a delay
  // Or customize based on test needs
  // callback(null); // Initially logged out
  // setTimeout(() => callback(mockAuthUser), 10); // Logged in after 10ms

  // Default: return an unsubscribe function
  return jest.fn();
});

const mockGetAuth = jest.fn(() => ({
  // Mock auth object properties if needed, e.g., currentUser
  currentUser: null, // Or mockAuthUser depending on test scenario
}));

// --- FIRESTORE ---
const mockGetDoc = jest.fn((docRef) => {
  // Simulate different docs based on path or id
  if (docRef.path.includes("users/test-uid")) {
    return Promise.resolve({
      exists: () => true,
      data: () => ({
        role: "Resident",
        email: "test@example.com",
        name: "Test User",
      }),
      id: "test-uid",
    });
  }
  if (docRef.path.includes("users/admin-uid")) {
    return Promise.resolve({
      exists: () => true,
      data: () => ({
        role: "Admin",
        email: "admin@example.com",
        name: "Admin User",
      }),
      id: "admin-uid",
    });
  }
  if (docRef.path.includes("users/staff-uid")) {
    return Promise.resolve({
      exists: () => true,
      data: () => ({
        role: "Staff",
        email: "staff@example.com",
        name: "Staff User",
      }),
      id: "staff-uid",
    });
  }
  // Default mock for non-existent doc
  return Promise.resolve({
    exists: () => false,
    data: () => undefined,
    id: "unknown",
  });
});

const mockSetDoc = jest.fn(() => Promise.resolve());
const mockUpdateDoc = jest.fn(() => Promise.resolve());
const mockDeleteDoc = jest.fn(() => Promise.resolve());
const mockCollection = jest.fn((db, path) => ({ path })); // Simple mock
const mockGetDocs = jest.fn((collectionRef) => {
  // Example: Mock returning pending users for AdminDashboard
  if (collectionRef.path === "users") {
    // You might need more sophisticated mocking based on queries (where clauses)
    // For simplicity, returning a couple of pending users
    return Promise.resolve({
      docs: [
        {
          id: "pending1",
          data: () => ({
            name: "Pending One",
            email: "pending1@test.com",
            status: "pending",
            role: "Resident",
          }),
        },
        {
          id: "pending2",
          data: () => ({
            name: "Pending Two",
            email: "pending2@test.com",
            status: "pending",
            role: "Staff",
          }),
        },
        {
          id: "approved1",
          data: () => ({
            name: "Approved One",
            email: "approved@test.com",
            status: "approved",
            role: "Resident",
          }),
        },
      ],
      empty: false,
    });
  }
  // Default empty result
  return Promise.resolve({ docs: [], empty: true });
});
const mockDoc = jest.fn((db, path, ...pathSegments) => ({
  path: `${path}/${pathSegments.join("/")}`,
})); // Simple mock
const mockWhere = jest.fn(() => ({})); // Mock query constraints simply for now
const mockQuery = jest.fn(
  (collectionRef, ...queryConstraints) => collectionRef
); // Return collection ref for simplicity

const mockFirestore = jest.fn(() => ({})); // Mock Firestore instance if needed

// --- MODULE EXPORTS ---
export const getAuth = mockGetAuth;
export const signInWithEmailAndPassword = mockSignInWithEmailAndPassword;
export const createUserWithEmailAndPassword =
  mockCreateUserWithEmailAndPassword;
export const sendPasswordResetEmail = mockSendPasswordResetEmail;
export const signOut = mockSignOut;
export const onAuthStateChanged = mockOnAuthStateChanged;

export const getFirestore = mockFirestore;
export const getDoc = mockGetDoc;
export const setDoc = mockSetDoc;
export const updateDoc = mockUpdateDoc;
export const deleteDoc = mockDeleteDoc;
export const collection = mockCollection;
export const getDocs = mockGetDocs;
export const doc = mockDoc;
export const where = mockWhere;
export const query = mockQuery;

// Mock other Firebase exports if your app uses them
