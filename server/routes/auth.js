const express = require("express");
const router = express.Router();
const { auth, db } = require("../firebase");

const {
  createUserWithEmailAndPassword
} = require("firebase/auth");

const { doc, setDoc, getDoc } = require("firebase/firestore");

router.post("/signup", async (req, res) => {
  const { name, email, password, role } = req.body;
  const trimmedPassword = password.trim();
  try {
    const userCred = await createUserWithEmailAndPassword(auth, email,trimmedPassword);
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

const FIREBASE_API_KEY = "AIzaSyAhEqXvmStTF2_IA7-fAxT074w27ZTubmA";

router.post("/signup/thirdparty", async (req, res) => {
  const { idToken, role } = req.body;

  try {
    const fetch = (await import("node-fetch")).default;

    // Verify the ID token using Firebase REST API
    const verifyRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!verifyRes.ok) {
      const error = await verifyRes.json();
      console.error("Firebase verification error:", error);
      return res.status(400).json({ 
        message: error.error.message || "Invalid authentication token" 
      });
    }

    const verifyData = await verifyRes.json();
    const userInfo = verifyData.users[0];
    const email = userInfo.email;
    const name = userInfo.displayName || email.split('@')[0];

    // Check if user already exists
    const userDoc = doc(db, "users", email);
    const snapshot = await getDoc(userDoc);

    if (snapshot.exists()) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create new user
    await setDoc(userDoc, {
      name,
      email,
      role: role || 'user',
      approved: false, 
      createdAt: new Date()
    });

    res.json({ email });

  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: err.message || "Signup failed" });
  }
});

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
          email:email,
          password:password,
          returnSecureToken: true
        }),
      }
    );

    if (!firebaseRes.ok) {
      const error = await firebaseRes.json();
      console.log(error)
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
      approved: userData.approved
    });
  } catch (err) {
    console.log(err)
    res.status(500).json({ message: err.message });
  }
});

router.post("/signin/thirdparty", async (req, res) => {
  const { idToken } = req.body;

  try {
    const fetch = (await import("node-fetch")).default;

    // Verify the ID token using Firebase REST API
    const verifyRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      }
    );

    if (!verifyRes.ok) {
      const error = await verifyRes.json();
      console.error("Firebase verification error:", error);
      return res.status(400).json({ 
        message: error.error.message || "Invalid authentication token" 
      });
    }

    const verifyData = await verifyRes.json();
    const email = verifyData.users[0].email;

    // Check if user exists in your database
    const userDoc = doc(db, "users", email);
    const snapshot = await getDoc(userDoc);

    if (!snapshot.exists()) {
      return res.status(404).json({ message: "User not registered." });
    }

    const userData = snapshot.data();

    if (!userData.approved) {
      return res.status(403).json({ message: "Account not yet approved." });
    }

    res.json({
      email: userData.email,
      role: userData.role,
      approved: userData.approved
    });

  } catch (err) {
    console.error("Auth error:", err);
    res.status(500).json({ message: err.message || "Authentication failed" });
  }
});

module.exports = router;

