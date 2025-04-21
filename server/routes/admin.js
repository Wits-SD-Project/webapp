const express = require("express");
const router = express.Router();
const { admin } = require("../firebase"); // Changed to import admin

router.post("/toggle-approval", async (req, res) => {
  const { email } = req.body;
  if (!email || email === "admin@gmail.com") {
    return res.status(400).json({ message: "Invalid email." });
  }

  try {
    const userRef = admin.firestore().collection("users").doc(email);
    const snap = await userRef.get();
    if (!snap.exists) {
      return res.status(404).json({ message: "User not found." });
    }

    const current = snap.data().approved || false;
    const next = !current;
    // Update the Firestore document
    await userRef.update({ approved: next });

    // Update custom claims so your security rules can see it
    const uid = snap.data().uid;
    if (uid) {
      await admin.auth().setCustomUserClaims(uid, {
        accepted: snap.data().accepted || false,
        approved: next,
      });
    }

    res.json({
      message: `${email} has been ${next ? "approved" : "revoked"}`,
      approved: next,
    });
  } catch (err) {
    console.error("toggle-approval error:", err);
    res.status(500).json({ message: "Failed to update approval status." });
  }
});

router.post("/toggle-accepted", async (req, res) => {
  const { email } = req.body;
  if (!email || email === "admin@gmail.com") {
    return res.status(400).json({ message: "Invalid email." });
  }
  try {
    const userRef = admin.firestore().collection("users").doc(email);
    const snap = await userRef.get();
    if (!snap.exists)
      return res.status(404).json({ message: "User not found." });

    const current = snap.data().accepted || false;
    const next = !current;
    await userRef.update({ accepted: next });

    // update custom claim if you use it
    const uid = snap.data().uid;
    if (uid) {
      await admin.auth().setCustomUserClaims(uid, {
        ...(snap.data().approved && { approved: true }),
        accepted: next,
      });
    }

    res.json({
      message: `${email} has been ${next ? "granted" : "revoked"} access`,
      accepted: next,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update accepted status." });
  }
});

// Get all users - Admin SDK version
router.get("/users", async (req, res) => {
  try {
    const snapshot = await admin.firestore().collection("users").get();

    const users = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
        // Add metadata if needed
        createdAt: doc.createTime?.toDate(),
        updatedAt: doc.updateTime?.toDate(),
      }))
      .filter((user) => user.email !== "admin@gmail.com");

    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Failed to fetch users.",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

module.exports = router;
