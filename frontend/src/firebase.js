import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAhEqXvmStTF2_IA7-fAxT074w27ZTubmA",
  authDomain: "sportssphere-58736.firebaseapp.com",
  projectId: "sportssphere-58736",
  storageBucket: "sportssphere-58736.firebasestorage.app",
  messagingSenderId: "575568726090",
  appId: "1:575568726090:web:6d92dbc812222646c3beb3"
};

//this is to initialise our auth
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export {app, auth};

export const db = getFirestore(app);
