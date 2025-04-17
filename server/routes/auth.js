const express = require("express");
const router = express.Router();
const { admin ,auth, db } = require("../firebase");

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

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

router.post("/signup/thirdparty", async (req, res) => {
  const { idToken, role } = req.body;

  try {
    // Verify the ID token using Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email;
    const name = decodedToken.name || email.split('@')[0];

    // Get the document reference
    const userRef = admin.firestore().collection("users").doc(email);
    
    // Check if user already exists
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create new user document using the reference
    await userRef.set({
      name,
      email,
      uid, // Store the Firebase UID for future reference
      role: role,
      approved: false, 
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Set custom claims
    await admin.auth().setCustomUserClaims(uid, { 
      role,
      approved: false
    });

    res.json({ 
      success: true,
      email: email,
      uid: uid
    });

  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ 
      success: false,
      message: "Signup failed",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
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
    res.status(500).json({ message: err.message });
  }
});

router.post("/signin/thirdparty", async (req, res) => {
  const { idToken } = req.body;

  try {
    // Verify the ID token using Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const email = decodedToken.email;

    // Check if user exists in your database
    const userDoc = await admin.firestore().collection("users").doc(email).get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: "User not registered." });
    }

    const userData = userDoc.data();

    if (!userData.approved) {
      return res.status(403).json({ message: "Account not yet approved." });
    }

    // Create a session cookie
    const expiresIn = 60 * 60 * 1000; // 1 hour
    const sessionCookie = await admin.auth().createSessionCookie(idToken, { 
      expiresIn 
    });

    res.cookie('authToken', sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', 
      sameSite: "lax",
      maxAge: expiresIn, 
      path: '/',
    });

    res.json({
      email: userData.email,
      role: userData.role,
      approved: userData.approved,
      name: userData.name || ''
    });

  } catch (err) {
    console.error("Auth error:", err);
    
    // Handle specific Firebase errors
    let errorMessage = "Authentication failed";
    if (err.code === 'auth/id-token-expired') {
      errorMessage = "Token expired - please refresh";
    } else if (err.code === 'auth/argument-error') {
      errorMessage = "Invalid token format";
    }

    res.status(500).json({ 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;

