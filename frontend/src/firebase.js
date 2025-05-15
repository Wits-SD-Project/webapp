import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
<<<<<<< HEAD
import { getFirestore } from "firebase/firestore";

// Ibram replace with your config
const firebaseConfig = {
  apiKey: "AIzaSyA_MjCm81gJVDzVav0kL_cgkzpdDEhmLBc",
  authDomain: "sportssphere-c2046.firebaseapp.com",
  projectId: "sportssphere-c2046",
  storageBucket: "sportssphere-c2046.firebasestorage.app",
  messagingSenderId: "295076511537",
  appId: "1:295076511537:web:4578290d4431b09218fa10",
  measurementId: "G-3YF5S1ZXTC",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
=======
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAhEqXvmStTF2_IA7-fAxT074w27ZTubmA",
  authDomain: "sportssphere-58736.firebaseapp.com",
  projectId: "sportssphere-58736",
  storageBucket: "sportssphere-58736.firebasestorage.app",
  messagingSenderId: "575568726090",
  appId: "1:575568726090:web:6d92dbc812222646c3beb3",
};

export async function getAuthToken(forceRefresh = true) {
  const user = auth.currentUser;
  if (!user) return "";
  return user.getIdToken(forceRefresh);
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
>>>>>>> 92d8f6e676a8150809db3ec0d9b73ef5820641fc
