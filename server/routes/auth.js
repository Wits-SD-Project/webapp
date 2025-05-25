const express = require("express");
const router = express.Router();
const { admin } = require("../firebase");

router.post("/signup/thirdparty", async (req, res) => {
  const { idToken, role } = req.body;

  try {
    // Verify the ID token using Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email;
    const name = decodedToken.name || email.split("@")[0];

    // Get the document reference
    const userRef = admin.firestore().collection("users").doc(email);

    // Check if user already exists
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      const userData = userDoc.data();
      if (!userData.approved) {
        return res.status(403).json({ message: "Account already registered, please wait for approval." });
      }
      if (!userData.accepted) {
        return res.status(403).json({ message: "Account already registered, Access revoked " });
      }

      return res.status(400).json({ message: "Account already registered, Click sign in" });
    }

    // Create new user document using the reference
    await userRef.set({
      name,
      email,
      uid, // Store the Firebase UID for future reference
      role: role,
      approved: false,
      accepted: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Set custom claims
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
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});


router.post("/signin/thirdparty", async (req, res) => {
  const { idToken } = req.body;

  try {
    // Verify the ID token using Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const email = decodedToken.email;

    // Check if user exists in your database
    const userDoc = await admin
      .firestore()
      .collection("users")
      .doc(email)
      .get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: "User not registered." });
    }

    const userData = userDoc.data();

    if (!userData.approved) {
      return res.status(403).json({ message: "Account not yet approved." });
    }
    if (!userData.accepted) {
      return res.status(403).json({ message: "Access denied." });
    }

    // Create a session cookie
    const expiresIn = 60 * 60 * 1000; // 1 hour
    const sessionCookie = await admin.auth().createSessionCookie(idToken, {
      expiresIn,
    });

    res.cookie("authToken", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
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

// Add to your backend routes
router.post("/verify-session", async (req, res) => {
  try {
    const { idToken } = req.body;

    // Verify the Firebase ID token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const email = decodedToken.email;

    // Check user in Firestore
    const userDoc = await admin.firestore().collection("users").doc(email).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ message: "User not registered" });
    }

    const userData = userDoc.data();
    
    if (!userData.approved || !userData.accepted) {
      return res.status(403).json({ message: "Account not authorized" });
    }

    res.json({
      user: {
        email: userData.email,
        role: userData.role,
        name: userData.name || ""
      }
    });
  } catch (error) {
    console.error("Session verification error:", error);
    res.status(401).json({ message: "Invalid session" });
  }
});

module.exports = router;
