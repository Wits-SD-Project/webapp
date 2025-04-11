import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
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
