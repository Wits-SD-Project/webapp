// Firebase SDK imports
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * Firebase project configuration - contains sensitive credentials
 */
const firebaseConfig = {
  apiKey: "AIzaSyAhEqXvmStTF2_IA7-fAxT074w27ZTubmA",          // API key for Firebase services
  authDomain: "sportssphere-58736.firebaseapp.com",          // Domain for Firebase Auth
  projectId: "sportssphere-58736",                          // Firebase project ID
  storageBucket: "sportssphere-58736.firebasestorage.app",   // Cloud Storage bucket
  messagingSenderId: "575568726090",                         // Cloud Messaging sender ID
  appId: "1:575568726090:web:6d92dbc812222646c3beb3",        // Firebase app ID
};

/**
 * Retrieves a fresh Firebase Auth ID token for authenticated requests
 * @returns {Promise<string>} Resolves with the JWT token
 * @throws {Error} When no user is signed in
 * 
 * @description This function handles both cases:
 * 1. When auth state is already loaded (returns fresh token immediately)
 * 2. During initial page load (waits for auth state hydration)
 * 
 * The `true` parameter forces token refresh to ensure validity
 */
export async function getAuthToken() {
  const auth = getAuth();

  // Case 1: User already authenticated - refresh token immediately
  if (auth.currentUser) {
    return await auth.currentUser.getIdToken(true);
  }

  // Case 2: Initial load - wait for auth state initialization
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(
      auth,
      async (user) => {
        unsub(); // Clean up listener immediately
        if (!user) {
          reject(new Error("User not signed in"));
          return;
        }
        resolve(await user.getIdToken(true));
      },
      (error) => {
        unsub();
        reject(error);
      }
    );
  });
}

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Export initialized services for use throughout application
export { auth, db };
