const express = require("express");
const router = express.Router();
const { admin } = require("../firebase"); // Changed to import admin

// Toggle user approval - now using Admin SDK
router.post("/toggle-approval", async (req, res) => {
  const { email } = req.body;

  if (!email || email === "admin@gmail.com") {
    return res.status(400).json({ message: "Invalid email." });
  }

  try {
    const userRef = admin.firestore().collection("users").doc(email);
    const snapshot = await userRef.get();

    if (!snapshot.exists) {
      return res.status(404).json({ message: "User not found." });
    }

    const currentStatus = snapshot.data().approved;
    const newStatus = !currentStatus;

    await userRef.update({ approved: newStatus });

    // Optional: Update custom claims if needed
    if (newStatus) {
      const uid = snapshot.data().uid; // Assuming you store uid in user document
      if (uid) {
        await admin.auth().setCustomUserClaims(uid, { approved: true });
      }
    }

    res.json({
      message: `${email} has been ${newStatus ? "approved" : "revoked"}`,
      approved: newStatus,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      message: "Failed to update approval status.",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
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
        updatedAt: doc.updateTime?.toDate()
      }))
      .filter((user) => user.email !== "admin@gmail.com");

    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ 
      message: "Failed to fetch users.",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

module.exports = router;