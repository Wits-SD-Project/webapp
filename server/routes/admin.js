const express = require("express");
const router = express.Router();
const { admin } = require("../firebase"); // Changed to import admin
const authenticate = require("../authenticate");

router.post('/toggle-approval', async (req, res) => {

  const { email } = req.body;
  if (!email || email === 'admin@gmail.com')
    return res.status(400).json({ message: 'Invalid email.' });

  try {
    const ref  = admin.firestore().collection('users').doc(email);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ message: 'User not found.' });

    const next = !snap.data().approved;
    await ref.update({ approved: next });

    const uid = snap.data().uid;
    if (uid) {
      await admin.auth().setCustomUserClaims(uid, {
        accepted: snap.data().accepted || false,
        approved: next,
      });
    }

    res.status(200).json({ approved: next });
  } catch (err) {
    console.error('toggle-approval error:', err);
    res.status(500).json({ message: 'Failed to update approval status.' });
  }
});

router.post("/events", authenticate, async (req, res) => {
  try {
    const userRef = admin.firestore().collection("users").doc(req.user.email);
    const snap = await userRef.get();

    if (!snap.exists) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    const userData = snap.data();
    if (userData.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Access denied. Admins only." });
    }

    const { eventName, facility, facilityId, description, startTime, endTime } =
      req.body;

    // === Step 1: Validate input ===
    if (
      !eventName ||
      typeof eventName !== "string" ||
      !facility ||
      typeof facility !== "string" ||
      !facilityId ||
      typeof facilityId !== "string" ||
      !description ||
      typeof description !== "string" ||
      !startTime ||
      !endTime
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Missing or invalid required fields.",
        });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid date format." });
    }

    if (start >= end) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Start time must be before end time.",
        });
    }

    if (start < now) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Cannot schedule events in the past.",
        });
    }

    const eventRef = admin.firestore().collection("admin-events");

    // === Step 2: Check for duplicate event (same name, facility, and startTime) ===
    const duplicateSnap = await eventRef
      .where("eventName", "==", eventName)
      .where("facilityId", "==", facilityId)
      .where("startTime", "==", start.toISOString())
      .get();

    if (!duplicateSnap.empty) {
      return res
        .status(409)
        .json({
          success: false,
          message:
            "Duplicate event with same name and start time at this facility.",
        });
    }

    // === Step 3: Check for overlapping events at the same facility ===
    const overlappingSnap = await eventRef
      .where("facilityId", "==", facilityId)
      .where("startTime", "<", end.toISOString()) // start before end
      .where("endTime", ">", start.toISOString()) // end after start
      .get();

    if (!overlappingSnap.empty) {
      return res
        .status(409)
        .json({
          success: false,
          message: "Overlapping event already scheduled at this facility.",
        });
    }

    // === Step 4: Add new event ===
    const newEventDoc = await eventRef.add({
      eventName,
      facility,
      facilityId,
      description,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      createdBy: req.user.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const responseEvent = {
      id: newEventDoc.id,
      eventName,
      facility: {
        id: facilityId,
        name: facility,
      },
      description,
      startTime: start,
      endTime: end,
      isEditing: false,
    };

    return res.status(201).json({
      success: true,
      event: responseEvent,
      message: "Event successfully created",
    });
  } catch (error) {
    console.error("Error creating event:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

// Get all users - Admin SDK version
router.get('/users', async (req, res) => {
  try {
    const snap = await admin.firestore().collection('users').get();
    const users = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((u) => u.email !== 'admin@gmail.com');

    res.status(200).json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch users.' });
  }
});

router.put("/events/:id", authenticate, async (req, res) => {
  try {
    const userRef = admin.firestore().collection("users").doc(req.user.email);
    const snap = await userRef.get();

    if (!snap.exists) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    const userData = snap.data();
    if (userData.role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Access denied. Admins only." });
    }

    const eventId = req.params.id;
    const { eventName, facility, facilityId, description, startTime, endTime } =
      req.body;

    // === Step 1: Validate input ===
    if (
      !eventName ||
      typeof eventName !== "string" ||
      !facility ||
      typeof facility !== "string" ||
      !facilityId ||
      typeof facilityId !== "string" ||
      !description ||
      typeof description !== "string" ||
      !startTime ||
      !endTime
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Missing or invalid required fields.",
        });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid date format." });
    }

    if (start >= end) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Start time must be before end time.",
        });
    }

    if (start < now) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Cannot update event to a past time.",
        });
    }

    const eventRef = admin.firestore().collection("admin-events").doc(eventId);
    const existingSnap = await eventRef.get();

    if (!existingSnap.exists) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found." });
    }

    const eventCollectionRef = admin.firestore().collection("admin-events");

    // === Step 2: Check for duplicate event with same name, facility, and startTime (excluding current) ===
    const duplicateSnap = await eventCollectionRef
      .where("eventName", "==", eventName)
      .where("facilityId", "==", facilityId)
      .where("startTime", "==", start.toISOString())
      .get();

    const isDuplicate = duplicateSnap.docs.some((doc) => doc.id !== eventId);
    if (isDuplicate) {
      return res
        .status(409)
        .json({
          success: false,
          message:
            "Duplicate event with same name and start time at this facility.",
        });
    }

    // === Step 3: Check for overlapping time at the same facility (excluding current) ===
    const overlappingSnap = await eventCollectionRef
      .where("facilityId", "==", facilityId)
      .where("startTime", "<", end.toISOString())
      .where("endTime", ">", start.toISOString())
      .get();

    const isOverlapping = overlappingSnap.docs.some(
      (doc) => doc.id !== eventId
    );
    if (isOverlapping) {
      return res
        .status(409)
        .json({
          success: false,
          message: "Overlapping event exists at this facility.",
        });
    }

    // === Step 4: Update event ===
    await eventRef.update({
      eventName,
      facility,
      facilityId,
      description,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
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
      startTime: start,
      endTime: end,
      isEditing: false,
    };

    return res.status(200).json({
      success: true,
      event: updatedEvent,
      message: "Event successfully updated",
    });
  } catch (error) {
    console.error("Error updating event:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
});

router.delete("/events/:id", authenticate, async (req, res) => {
  try {
    const userRef = admin.firestore().collection("users").doc(req.user.email);
    const snap = await userRef.get();

    if (!snap.exists || snap.data().role !== "admin") {
      return res
        .status(403)
        .json({ success: false, message: "Access denied. Admins only." });
    }

    const eventId = req.params.id;
    const eventRef = admin.firestore().collection("admin-events").doc(eventId);
    const doc = await eventRef.get();

    if (!doc.exists) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found." });
    }

    await eventRef.delete();

    return res
      .status(200)
      .json({ success: true, message: "Event successfully deleted." });
  } catch (error) {
    console.error("Error deleting event:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error." });
  }
});

// POST /api/admin/block-slot
router.post("/block-slot", authenticate, async (req, res) => {
  try {
    // 0. admin‐only guard (reuse the user → role check you already wrote)
    const userRef = admin.firestore().collection("users").doc(req.user.email);
    const userSnap = await userRef.get();
    if (!userSnap.exists || userSnap.data().role !== "admin")
      return res.status(403).json({ success: false, message: "Admins only" });

    // 1. validate body
    const { facilityId, facilityName, slot, date } = req.body;
    if (!facilityId || !slot || !date || !facilityName)
      return res
        .status(400)
        .json({ success: false, message: "Missing fields" });

    const bookingsRef = admin.firestore().collection("bookings");

    // 2. reject if someone already booked it on that day
    const clashSnap = await bookingsRef
      .where("facilityId", "==", facilityId)
      .where("date", "==", date)
      .where("slot", "==", slot)
      .get();

    if (!clashSnap.empty)
      return res
        .status(409)
        .json({ success: false, message: "Slot already taken" });

    // 3. write booking, status = approved
    await bookingsRef.add({
      facilityId,
      facilityName,
      slot,
      date,
      userId: req.user.uid,
      userName: req.user.email,
      status: "approved",
      createdByRole: "admin",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isBlocked:true,
    });

    res.status(201).json({ success: true, message: "Timeslot blocked" });
  } catch (err) {
    console.error("Block‑slot error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Fetch all admin events
router.get('/events', authenticate, async (req, res) => {
  const me = await admin.firestore().collection('users').doc(req.user.email).get();
  if (!me.exists || me.data().role !== 'admin') return res.sendStatus(403);

  try {
    const snap = await admin.firestore().collection('admin-events').orderBy('startTime').get();

    const events = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((e) => e.eventName && e.startTime) // ignore stray mock docs
      .map((e) => ({
        id: e.id,
        eventName: e.eventName,
        facility: { id: e.facilityId, name: e.facility },
        description: e.description,
        startTime: new Date(e.startTime),
        endTime: new Date(e.endTime),
        isEditing: false,
      }));

    res.status(200).json({ success: true, count: events.length, events });
  } catch (err) {
    console.error('Error fetching admin events:', err);
    res.status(500).json({ message: 'Failed to fetch admin events' });
  }
});

// 🛠 GET maintenance issue summary
router.get('/maintenance-summary', authenticate, async (req, res) => {
  const { facility, dateRange } = req.query;

  const me = await admin.firestore().collection('users').doc(req.user.email).get();
  if (!me.exists || me.data().role !== 'admin')
    return res.status(403).json({ message: 'Access denied. Admins only.' });

  try {
    let q = admin.firestore().collection('maintenance-reports');
    if (facility) q = q.where('facilityName', '==', facility);
    if (dateRange === 'last30days') {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      q = q.where('createdAt', '>=', since);
    }

    const issues = (await q.get()).docs.map((d) => d.data());

    let openCount = 0,
      closedCount = 0;
    const grouped = {};

    for (const i of issues) {
      if (i.status === 'open' || i.status === 'opened') openCount++;
      else if (i.status === 'closed') closedCount++;

      if (!facility) {
        const f = i.facilityName || 'Unknown';
        grouped[f] = grouped[f] || { open: 0, closed: 0 };
        if (i.status === 'open' || i.status === 'opened') grouped[f].open++;
        if (i.status === 'closed') grouped[f].closed++;
      }
    }

    const resp = { openCount, closedCount };
    if (!facility) resp.groupedByFacility = grouped;
    res.status(200).json(resp);
  } catch (err) {
    console.error('summary error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
});

router.get("/maintenance-reports", authenticate, async (req, res) => {
  try {
    const userSnap = await admin
      .firestore()
      .collection("users")
      .doc(req.user.email)
      .get();

    if (!userSnap.exists || userSnap.data().role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    const snapshot = await admin
      .firestore()
      .collection("maintenance-reports")
      .get();
    const reports = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({ success: true, reports });
  } catch (error) {
    console.error("Error fetching maintenance reports:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch maintenance reports" });
  }
});

router.get("/facilities", authenticate, async (req, res) => {
  try {
    const snapshot = await admin
      .firestore()
      .collection("facilities-test")
      .get();

    const facilities = snapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name,
    }));

    res.status(200).json({ success: true, facilities });
  } catch (error) {
    console.error("Error fetching facilities:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch facilities" });
  }
});

module.exports = router;
