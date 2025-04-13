import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword, GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  sendEmailVerification
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth} from "../firebase";
import { db } from "../firebase";


export const signUpUser = async ({ fullName, email, password, role }) => {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);

  await setDoc(doc(db, "users", user.uid), {
    fullName,
    email,
    role,
    approved: false,
    createdAt: new Date(),
  });

  // return the info you need in the UI
  return { fullName, email, role, uid: user.uid };
};


export const signInUser = async ({ email, password }) => {
  const userCred = await signInWithEmailAndPassword(auth, email, password);

  const userDoc = await getDoc(doc(db, "users", email));
  if (!userDoc.exists()) {
    throw new Error("User profile not found in database.");
  }

  const userData = userDoc.data();
  if (!userData.approved) {
    throw new Error("Account not yet approved by admin.");
  }

  return {
    //the user's name
    name: userData.name,
    email: userData.email,
    role: userData.role,
    approved: userData.approved,
  };
};

export const doSignInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  //result.user ... used to store in firestore
  return result;
}

//extra code for users to SignOut functionality
export const doSignOut = () => {
  return auth.signOut();
};

// //extra code for users to do a Password chnage
// export const doPasswordReset = (email) => {
//   return sendPasswordResetEmail(auth, email);
// }

// //extra code for Password Change
// export const doPasswordChange = (password) => {
//   return sendPasswordResetEmail(auth, password);
// }

// //extra code to send user a verification email
// export const doSendEmailVerification = () => {
//   return sendEmailVerification(auth.currentUser, {
//     url: `${window.location.origin}/home`,
//   });
// };

