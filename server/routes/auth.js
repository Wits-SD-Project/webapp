const express = require("express");
const router = express.Router();
const { auth, db } = require("../firebase");

const {
  createUserWithEmailAndPassword
} = require("firebase/auth");

const { doc, setDoc, getDoc } = require("firebase/firestore");

router.post("/signup", async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    const userCred = await createUserWithEmailAndPassword(auth, email, password);
    const userDoc = doc(db, "users", email);
    
    await setDoc(userDoc, {
      name,
      email,
      role,
      approved: false,
      createdAt: new Date(),
    });

    res.json({ email: userCred.user.email });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

const FIREBASE_API_KEY = "AIzaSyA_MjCm81gJVDzVav0kL_cgkzpdDEhmLBc";

router.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  try {
    const fetch = (await import("node-fetch")).default;

    const firebaseRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      }
    );

    if (!firebaseRes.ok) {
      const error = await firebaseRes.json();
      return res.status(400).json({ message: error.error.message });
    }

    const data = await firebaseRes.json();

    const userDoc = doc(db, "users", email);
    const snapshot = await getDoc(userDoc);

    if (!snapshot.exists()) {
      return res.status(404).json({ message: "User profile not found in database." });
    }

    const userData = snapshot.data();

    if (!userData.approved) {
      return res.status(403).json({ message: "Account not yet approved by admin." });
    }

    res.json({
      email: userData.email,
      role: userData.role,
      approved: userData.approved,
      idToken: data.idToken,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
