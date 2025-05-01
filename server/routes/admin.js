const express = require("express");
const router = express.Router();
const { admin } = require("../firebase"); // Changed to import admin
const authenticate = require("../authenticate");

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

//Ibram's code:
router.post("/events", authenticate, async (req, res) => {
  const userRef = admin.firestore().collection("users").doc(req.user.email);
  const snap = await userRef.get();

  if (!snap.exists) {
    return res.status(404).json({ message: "User not found." });
  }

  const data = snap.data();
  if (data.role !== "admin") {
    return res.status(403).json({ success: false, message: "Access denied. Admins only." });
  }

  try {
    const {
      eventName,
      facility,
      facilityId,
      description,
      startTime,
      endTime,
    } = req.body;

    if (!facilityId || !eventName || !startTime || !endTime || !description || !facility) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const eventRef = admin.firestore().collection("admin-events");

    // Check for duplicate event by name, facility, and overlapping start time
    const duplicateSnap = await eventRef
      .where("eventName", "==", eventName)
      .where("facilityId", "==", facilityId)
      .where("startTime", "==", startTime) // You can improve this to check for time ranges if needed
      .get();

    if (!duplicateSnap.empty) {
      return res.status(409).json({ success: false, message: "Duplicate event detected." });
    }

    // Add new event
    const newEventDoc = await eventRef.add({
      eventName,
      facility,
      facilityId,
      description,
      startTime,
      endTime,
      createdBy: req.user.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Return the event in required format
    const responseEvent = {
      id: newEventDoc.id,
      eventName,
      facility: {
        id: facilityId,
        name: facility,
      },
      description,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      isEditing: false,
    };

    return res.status(201).json({ success: true, event: responseEvent,message:"Event successfully created"});
  } catch (error) {
    console.error("Error creating event:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.put("/events/:id", authenticate, async (req, res) => {
  const userRef = admin.firestore().collection("users").doc(req.user.email);
  const snap = await userRef.get();

  if (!snap.exists) {
    return res.status(404).json({ message: "User not found." });
  }

  const data = snap.data();
  if (data.role !== "admin") {
    return res.status(403).json({ success: false, message: "Access denied. Admins only." });
  }

  try {
    const eventId = req.params.id;
    const {
      eventName,
      facility,
      facilityId,
      description,
      startTime,
      endTime,
    } = req.body;

    if (!eventName || !facility || !facilityId || !description || !startTime || !endTime) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const eventRef = admin.firestore().collection("admin-events").doc(eventId);
    const existing = await eventRef.get();

    if (!existing.exists) {
      return res.status(404).json({ success: false, message: "Event not found." });
    }

    await eventRef.update({
      eventName,
      facility,
      facilityId,
      description,
      startTime,
      endTime,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const updatedEvent = {
      id: eventId,
      eventName,
      facility: {
        id: facilityId,
        name: facility,
      },
      description,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      isEditing: false,
    };

    return res.status(200).json({ success: true, event: updatedEvent, message: "Event successfully updated" });
  } catch (error) {
    console.error("Error updating event:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});


module.exports = router;
