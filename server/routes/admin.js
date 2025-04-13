const express = require("express");
const router = express.Router();
const { db } = require("../firebase");
const { doc, updateDoc, getDoc ,getDocs,collection } = require("firebase/firestore");

// Toggle user approval
router.post("/toggle-approval", async (req, res) => {
  const { email } = req.body;

  if (!email || email === "admin@gmail.com") {
    return res.status(400).json({ message: "Invalid email." });
  }

  try {
    const userRef = doc(db, "users", email);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
      return res.status(404).json({ message: "User not found." });
    }

    const currentStatus = snapshot.data().approved;
    const newStatus = !currentStatus;

    await updateDoc(userRef, { approved: newStatus });

    res.json({
      message: `${email} has been ${newStatus ? "approved" : "revoked"}`,
      approved: newStatus,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update approval status." });
  }
});

router.get("/users", async (req, res) => {
    try {
      const snapshot = await getDocs(collection(db, "users"));
  
      const users = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((user) => user.email !== "admin@gmail.com");
  
      res.json(users);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to fetch users." });
    }
  });

module.exports = router;
