import {
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

export const signUpUser = async ({ name, email, password, role }) => {
  const res = await fetch("http://localhost:5000/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password, role }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Signup failed");
  }

  return await res.json();
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
