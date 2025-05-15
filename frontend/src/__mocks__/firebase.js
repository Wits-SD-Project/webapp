// src/__mocks__/firebase.js

// --- AUTH ---
const mockAuthUser = {
  uid: "test-uid",
  email: "test@example.com",
  displayName: "Test User Mock", // Add displayName if used
  getIdToken: jest.fn(() => Promise.resolve("mock-test-token")), // Mock getIdToken
  // Add other user properties if needed
};

const mockAuthInstance = {
  // Start with currentUser as null, tests can change it
  currentUser: null,
  // Mock other methods if needed by components/tests
  // signOut: jest.fn(() => {
  //    mockAuthInstance.currentUser = null; // Simulate sign out locally
  //    // Trigger the onAuthStateChanged listener if mocked comprehensively
  //    if (authCallback) authCallback(null);
  //    return Promise.resolve();
  // }),
};

// Allow callback storage for onAuthStateChanged simulation
let authCallback = null;

const mockSignInWithEmailAndPassword = jest.fn(() =>
  Promise.resolve({ user: mockAuthUser })
);
const mockCreateUserWithEmailAndPassword = jest.fn(() =>
  Promise.resolve({ user: mockAuthUser })
);
const mockSendPasswordResetEmail = jest.fn(() => Promise.resolve());
const mockSignOut = jest.fn(() => {
  mockAuthInstance.currentUser = null; // Simulate sign out
  if (authCallback) authCallback(null); // Trigger listener if mocked
  return Promise.resolve();
});
const mockOnAuthStateChanged = jest.fn((auth, callback) => {
  // Store the callback to be triggered manually in tests or by other mocks
  authCallback = callback;
  // Simulate initial state if needed, e.g., checking existing user
  // callback(mockAuthInstance.currentUser);
  // Return a mock unsubscribe function
  return jest.fn();
});

const mockGetAuth = jest.fn(() => mockAuthInstance); // Return the mutable instance

// Mock Google Auth Provider and related functions
const mockGoogleAuthProvider = jest.fn(() => ({ providerId: "google.com" })); // Mock constructor
const mockSignInWithPopup = jest.fn(() =>
  Promise.resolve({ user: mockAuthUser, credential: {} })
); // Mock popup sign-in
const mockCredentialFromResult = jest.fn(() => ({
  accessToken: "mock-access-token", // ✅ make it truthy
}));

// --- FIRESTORE ---
const mockDb = { type: "firestore-db-mock" }; // A simple mock db object

const mockGetDoc = jest.fn((docRef) => {
  // Simulate different docs based on path or id
  if (docRef._path === "users/test-uid") {
    // Check mocked path
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
  // Add other specific user mocks as needed
  // Default mock for non-existent doc
  return Promise.resolve({
    exists: () => false,
    data: () => undefined,
    id: docRef.id || "unknown",
  });
});

const buildCollection = (db, path) => {
  if (!db || db.type !== "firestore-db-mock") {
    throw new Error(
      "Expected first argument to collection() to be a FirebaseFirestore instance (mock)"
    );
  }
  return { _db: db, _path: path, type: "collection" };
};

const buildDoc = (db, collectionPath, ...segments) => ({
  _db: db,
  _path: `${collectionPath}/${segments.join("/")}`,
  id: segments[segments.length - 1] || "mockId",
  type: "doc",
});

const mockSetDoc = jest.fn(() => Promise.resolve());
const mockUpdateDoc = jest.fn(() => Promise.resolve());
const mockDeleteDoc = jest.fn(() => Promise.resolve());
const mockCollection = jest.fn((dbInstance, path) => {
  if (!dbInstance || dbInstance.type !== "firestore-db-mock") {
    throw new Error(
      "Expected first argument to collection() to be a FirebaseFirestore instance (mock)"
    );
  }
  return {
    _path: path,
    _db: dbInstance,
    type: "collection",
  };
});

const mockGetDocs = jest.fn((queryOrCollectionRef) => {
  // Basic default: return empty
  console.log(
    "Mock getDocs called for:",
    queryOrCollectionRef?._path ||
      queryOrCollectionRef?._query?._collectionRef?._path
  ); // Log path for debugging
  return Promise.resolve({ docs: [], empty: true });
});
const mockDoc = jest.fn((dbInstance, collectionPath, ...pathSegments) => ({
  _path: `${collectionPath}/${pathSegments.join("/")}`,
  _db: dbInstance,
  id: pathSegments[pathSegments.length - 1] || "mockDocId", // Mock ID from last segment
  type: "doc",
}));
const mockWhere = jest.fn((field, op, value) => ({
  type: "where",
  field,
  op,
  value,
})); // Mock query constraints
const mockQuery = jest.fn((collectionRef, ...queryConstraints) => ({
  // Mock query object
  _query: true, // Mark it as a query object
  _collectionRef: collectionRef,
  _constraints: queryConstraints,
}));

const mockGetFirestore = jest.fn(() => mockDb); // Mock getFirestore to return the mock db

export let __triggerAuthCallback;
mockOnAuthStateChanged.mockImplementation((auth, callback) => {
  __triggerAuthCallback = callback;
  return jest.fn(); // unsubscribe function
});

// ──────────────────────────────────────────────────────────────
//  src/__mocks__/firebase.js   (fully self-contained mock)
// ──────────────────────────────────────────────────────────────

/* ============================================================ */
/*                          AUTH MOCK                           */
/* ============================================================ */
export const auth = { currentUser: null };
export const getAuth = jest.fn(() => auth);

export const onAuthStateChanged = jest.fn(() => () => {});
export const signInWithEmailAndPassword = jest.fn();
export const createUserWithEmailAndPassword = jest.fn();
export const sendPasswordResetEmail = jest.fn();
export const signOut = jest.fn();

export const GoogleAuthProvider = jest.fn(() => ({}));
GoogleAuthProvider.credentialFromResult = jest.fn(() => ({}));
export const signInWithPopup = jest.fn();

/* ============================================================ */
/*                       FIRESTORE MOCK                          */
/* ============================================================ */
export const db = { type: "firestore-db-mock" };

/* a collection / doc builder that *always* carries _path + id */
export const collection = jest.fn((_dbIgnored, path) => ({
  _db: db,
  _path: path,
  type: "collection",
}));

export const doc = jest.fn((_dbIgnored, colPath, ...segments) => ({
  _db: db,
  _path: `${colPath}/${segments.join("/")}`,
  id: segments[segments.length - 1] || "mockId",
  type: "doc",
}));

/* helpers that tests can overwrite in `beforeEach` */
export const getDocs = jest.fn(async (colRef) => ({
  docs: [],
  empty: true,
}));
export const getDoc = jest.fn(async () => ({ exists: () => false }));
export const setDoc = jest.fn(async () => undefined);
export const updateDoc = jest.fn(async () => undefined);
export const deleteDoc = jest.fn(async () => undefined);

export const getFirestore = jest.fn(() => db);

/* trivial stubs to satisfy any imports */
export const where = jest.fn(() => ({}));
export const query = jest.fn(() => ({}));

/* ============================================================ */
/*                   UNIVERSAL RESET HELPER                     */
/* ============================================================ */
export const resetFirebaseMock = () => {
  [
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    getFirestore,
    where,
    query,
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut,
    GoogleAuthProvider,
    signInWithPopup,
  ].forEach((fn) => fn.mockClear?.());

  /* default safe behaviour */
  getDocs.mockResolvedValue({ docs: [], empty: true });
  getDoc.mockResolvedValue({ exists: () => false });
};
