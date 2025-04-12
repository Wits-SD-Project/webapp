import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword, GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  sendEmailVerification
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

export const signUpUser = async ({ name, email, password, role }) => {
  const userCred = await createUserWithEmailAndPassword(auth, email, password);

  const userDoc = doc(db, "users", email); // <-- use email as the doc ID
  await setDoc(userDoc, {
    name,
    email,
    role,
    approved: false,
    createdAt: new Date(),
  });

  return userCred.user;
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

