const { initializeApp } = require("firebase/app");
const { getAuth } = require("firebase/auth");
const { getFirestore } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyAhEqXvmStTF2_IA7-fAxT074w27ZTubmA",
  authDomain: "sportssphere-58736.firebaseapp.com",
  projectId: "sportssphere-58736",
  storageBucket: "sportssphere-58736.firebasestorage.app",
  messagingSenderId: "575568726090",
  appId: "1:575568726090:web:6d92dbc812222646c3beb3"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

module.exports = { auth, db };
