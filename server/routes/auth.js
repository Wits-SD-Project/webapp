const express = require("express");
const router = express.Router();
const { admin } = require("../firebase");

/**
 * Third-party Signup Endpoint
 * Handles registration for users authenticating via third-party providers (Google, Facebook, etc.)
 * 
 * Flow:
 * 1. Verifies ID token from provider
 * 2. Checks for existing user
 * 3. Creates new user document in Firestore
 * 4. Sets custom claims in Firebase Auth
 */
router.post("/signup/thirdparty", async (req, res) => {
  const { idToken, role } = req.body;

  try {
    // Step 1: Verify the ID token using Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email;
    // Use name from token or fallback to email prefix
    const name = decodedToken.name || email.split("@")[0];

    // Step 2: Get reference to user document in Firestore
    const userRef = admin.firestore().collection("users").doc(email);

    // Step 3: Check for existing user
    const userDoc = await userRef.get();
    if (userDoc.exists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Step 4: Create new user document
    await userRef.set({
      name,
      email,
      uid, // Store Firebase UID for cross-reference
      role: role,
      approved: false, // Requires admin approval
      accepted: false, // Requires user acceptance
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Step 5: Set custom claims for role-based access control
    await admin.auth().setCustomUserClaims(uid, {
      role,
      approved: false,
    });

    res.json({
      success: true,
      email: email,
      uid: uid,
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({
      success: false,
      message: "Signup failed",
      // Only show error details in development
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

/**
 * Third-party Signin Endpoint
 * Handles authentication for existing third-party users
 * 
 * Flow:
 * 1. Verifies ID token
 * 2. Checks user status (approved/accepted)
 * 3. Creates session cookie
 */
router.post("/signin/thirdparty", async (req, res) => {
  const { idToken } = req.body;

  try {
    // Step 1: Verify ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const email = decodedToken.email;

    // Step 2: Check user existence in Firestore
    const userDoc = await admin
      .firestore()
      .collection("users")
      .doc(email)
      .get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: "User not registered." });
    }

    const userData = userDoc.data();

    // Step 3: Verify account status
    if (!userData.approved) {
      return res.status(403).json({ message: "Account not yet approved." });
    }
    if (!userData.accepted) {
      return res.status(403).json({ message: "Access denied." });
    }

    // Step 4: Create session cookie
    const expiresIn = 60 * 60 * 1000; // 1 hour expiration
    const sessionCookie = await admin.auth().createSessionCookie(idToken, {
      expiresIn,
    });

    // Set secure HTTP-only cookie
    res.cookie("authToken", sessionCookie, {
      httpOnly: true, // Prevents XSS attacks
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      sameSite: "lax", // Balances security and usability
      maxAge: expiresIn,
      path: "/",
    });

    res.json({
      email: userData.email,
      role: userData.role,
      approved: userData.approved,
      accepted: userData.accepted,
      name: userData.name || "",
    });
  } catch (err) {
    console.error("Auth error:", err);

    // Handle specific Firebase errors
    let errorMessage = "Authentication failed";
    if (err.code === "auth/id-token-expired") {
      errorMessage = "Token expired - please refresh";
    } else if (err.code === "auth/argument-error") {
      errorMessage = "Invalid token format";
    }

    res.status(500).json({
      message: errorMessage,
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

/**
 * Session Verification Endpoint
 * Validates active sessions and returns user data
 * 
 * Flow:
 * 1. Verifies ID token
 * 2. Checks user status
 * 3. Returns minimal user data
 */
router.post("/verify-session", async (req, res) => {
  try {
    const { idToken } = req.body;
    
    // Step 1: Verify token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const email = decodedToken.email;

    // Step 2: Check user in Firestore
    const userDoc = await admin.firestore().collection("users").doc(email).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ message: "User not registered" });
    }

    const userData = userDoc.data();
    
    // Step 3: Verify authorization status
    if (!userData.approved || !userData.accepted) {
      return res.status(403).json({ message: "Account not authorized" });
    }

    // Step 4: Return essential user data
    res.json({
      user: {
        email: userData.email,
        role: userData.role, // For role-based UI rendering
        name: userData.name || "" // Fallback to empty string
      }
    });
  } catch (error) {
    console.error("Session verification error:", error);
    res.status(401).json({ message: "Invalid session" });
  }
});

module.exports = router;
