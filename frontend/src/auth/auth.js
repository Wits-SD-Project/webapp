<<<<<<< HEAD
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
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
=======
import { getAuth } from "firebase/auth";

export const getAuthToken = async () => {
  const user = getAuth().currentUser;
  if (!user) throw new Error("User not authenticated");
  return user.getIdToken();
};

export const signUpWithThirdParty = async ({ idToken, provider, role }) => {
  const res = await fetch(
    // "https://ssbackend-aka9gddqdxesexh5.canadacentral-01.azurewebsites.net/api/auth/signup/thirdparty",
    "http://localhost:8080/api/auth/signup/thirdparty",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, provider, role }),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Third-party signup failed");
  }

  return await res.json();
};

export const signInWithThirdParty = async ({ idToken }) => {
  const res = await fetch(
    // "https://ssbackend-aka9gddqdxesexh5.canadacentral-01.azurewebsites.net/api/auth/signin/thirdparty",
    "http://localhost:8080/api/auth/signin/thirdparty",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Third-party signin failed");
  }

  return await res.json();
};

export const uploadFacility = async ({
  name,
  type,
  isOutdoors,
  availability,
}) => {
  const res = await fetch("http://localhost:8080/api/facilities/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, type, isOutdoors, availability }),
    credentials: "include",
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "Facility Upload Failed");
  }

  return await res.json();
>>>>>>> 92d8f6e676a8150809db3ec0d9b73ef5820641fc
};
