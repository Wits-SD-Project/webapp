const { initializeApp } = require("firebase/app");
const { getAuth } = require("firebase/auth");
const { getFirestore } = require("firebase/firestore");

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

const auth = getAuth(app);
const db = getFirestore(app);

module.exports = { auth, db };
