const express = require("express");
const router = express.Router();
const { auth, db } = require("../firebase");

const {
  createUserWithEmailAndPassword
} = require("firebase/auth");

const { doc, setDoc } = require("firebase/firestore");

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

module.exports = router;
