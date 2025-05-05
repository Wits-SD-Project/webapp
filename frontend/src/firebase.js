import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc, serverTimestamp} from "firebase/firestore";


const firebaseConfig = {
  apiKey: "AIzaSyAhEqXvmStTF2_IA7-fAxT074w27ZTubmA",
  authDomain: "sportssphere-58736.firebaseapp.com",
  projectId: "sportssphere-58736",
  storageBucket: "sportssphere-58736.firebasestorage.app",
  messagingSenderId: "575568726090",
  appId: "1:575568726090:web:6d92dbc812222646c3beb3",
};



export async function getAuthToken() {
  const auth = getAuth();

  // If the user is already available, refresh the token immediately.
  if (auth.currentUser) {
    return await auth.currentUser.getIdToken(true); // true → force refresh
  }

  // First page-load: wait until Firebase finishes hydrating auth state.
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      unsub();
      if (!user) {
        reject(new Error("User not signed in"));
        return;
      }
      resolve(await user.getIdToken(true));
    });
  });
}


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db};