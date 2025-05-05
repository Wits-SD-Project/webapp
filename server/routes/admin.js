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

router.post("/events", authenticate, async (req, res) => {
  try {
    const userRef = admin.firestore().collection("users").doc(req.user.email);
    const snap = await userRef.get();

    if (!snap.exists) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const userData = snap.data();
    if (userData.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied. Admins only." });
    }

    const {
      eventName,
      facility,
      facilityId,
      description,
      startTime,
      endTime,
    } = req.body;

    // === Step 1: Validate input ===
    if (
      !eventName || typeof eventName !== "string" ||
      !facility || typeof facility !== "string" ||
      !facilityId || typeof facilityId !== "string" ||
      !description || typeof description !== "string" ||
      !startTime || !endTime
    ) {
      return res.status(400).json({ success: false, message: "Missing or invalid required fields." });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid date format." });
    }

    if (start >= end) {
      return res.status(400).json({ success: false, message: "Start time must be before end time." });
    }

    if (start < now) {
      return res.status(400).json({ success: false, message: "Cannot schedule events in the past." });
    }

    const eventRef = admin.firestore().collection("admin-events");

    // === Step 2: Check for duplicate event (same name, facility, and startTime) ===
    const duplicateSnap = await eventRef
      .where("eventName", "==", eventName)
      .where("facilityId", "==", facilityId)
      .where("startTime", "==", start.toISOString())
      .get();

    if (!duplicateSnap.empty) {
      return res.status(409).json({ success: false, message: "Duplicate event with same name and start time at this facility." });
    }

    // === Step 3: Check for overlapping events at the same facility ===
    const overlappingSnap = await eventRef
      .where("facilityId", "==", facilityId)
      .where("startTime", "<", end.toISOString()) // start before end
      .where("endTime", ">", start.toISOString()) // end after start
      .get();

    if (!overlappingSnap.empty) {
      return res.status(409).json({ success: false, message: "Overlapping event already scheduled at this facility." });
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
    return res.status(500).json({ success: false, message: "Internal server error" });
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


router.put("/events/:id", authenticate, async (req, res) => {
  try {
    const userRef = admin.firestore().collection("users").doc(req.user.email);
    const snap = await userRef.get();

    if (!snap.exists) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const userData = snap.data();
    if (userData.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied. Admins only." });
    }

    const eventId = req.params.id;
    const {
      eventName,
      facility,
      facilityId,
      description,
      startTime,
      endTime,
    } = req.body;

    // === Step 1: Validate input ===
    if (
      !eventName || typeof eventName !== "string" ||
      !facility || typeof facility !== "string" ||
      !facilityId || typeof facilityId !== "string" ||
      !description || typeof description !== "string" ||
      !startTime || !endTime
    ) {
      return res.status(400).json({ success: false, message: "Missing or invalid required fields." });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const now = new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid date format." });
    }

    if (start >= end) {
      return res.status(400).json({ success: false, message: "Start time must be before end time." });
    }

    if (start < now) {
      return res.status(400).json({ success: false, message: "Cannot update event to a past time." });
    }

    const eventRef = admin.firestore().collection("admin-events").doc(eventId);
    const existingSnap = await eventRef.get();

    if (!existingSnap.exists) {
      return res.status(404).json({ success: false, message: "Event not found." });
    }

    const eventCollectionRef = admin.firestore().collection("admin-events");

    // === Step 2: Check for duplicate event with same name, facility, and startTime (excluding current) ===
    const duplicateSnap = await eventCollectionRef
      .where("eventName", "==", eventName)
      .where("facilityId", "==", facilityId)
      .where("startTime", "==", start.toISOString())
      .get();

    const isDuplicate = duplicateSnap.docs.some(doc => doc.id !== eventId);
    if (isDuplicate) {
      return res.status(409).json({ success: false, message: "Duplicate event with same name and start time at this facility." });
    }

    // === Step 3: Check for overlapping time at the same facility (excluding current) ===
    const overlappingSnap = await eventCollectionRef
      .where("facilityId", "==", facilityId)
      .where("startTime", "<", end.toISOString())
      .where("endTime", ">", start.toISOString())
      .get();

    const isOverlapping = overlappingSnap.docs.some(doc => doc.id !== eventId);
    if (isOverlapping) {
      return res.status(409).json({ success: false, message: "Overlapping event exists at this facility." });
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
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.delete("/events/:id", authenticate, async (req, res) => {
  try {
    const userRef = admin.firestore().collection("users").doc(req.user.email);
    const snap = await userRef.get();

    if (!snap.exists || snap.data().role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied. Admins only." });
    }

    const eventId = req.params.id;
    const eventRef = admin.firestore().collection("admin-events").doc(eventId);
    const doc = await eventRef.get();

    if (!doc.exists) {
      return res.status(404).json({ success: false, message: "Event not found." });
    }

    await eventRef.delete();

    return res.status(200).json({ success: true, message: "Event successfully deleted." });
  } catch (error) {
    console.error("Error deleting event:", error);
    return res.status(500).json({ success: false, message: "Internal server error." });
  }
});


// Fetch all admin events
router.get("/events", authenticate, async (req, res) => {
  try {
    // 1. Fetch the user's document
    const userRef = admin.firestore().collection("users").doc(req.user.email);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
        errorCode: "USER_NOT_FOUND",
      });
    }

    const userData = userSnap.data();

    // 2. Check if user is an admin
    if (userData.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admins only.",
        errorCode: "FORBIDDEN",
      });
    }

    // 3. Query admin events
    const eventsRef = admin.firestore().collection("admin-events");
    const snapshot = await eventsRef.orderBy("startTime").get();

    // 4. Format response data
    const events = snapshot.docs.map((doc) => {
      const event = doc.data();
      return {
        id: doc.id,
        eventName: event.eventName,
        facility: {
          id: event.facilityId,
          name: event.facility,
        },
        description: event.description,
        startTime: new Date(event.startTime),
        endTime: new Date(event.endTime),
        isEditing: false,
      };
    });

    // 5. Success response
    res.status(200).json({
      success: true,
      count: events.length,
      events,
    });

  } catch (error) {
    console.error("Error fetching admin events:", error);

    // 6. Error handling
    const errorResponse = {
      success: false,
      message: "Failed to fetch admin events",
      errorCode: "FETCH_ERROR",
    };

    if (process.env.NODE_ENV === "development") {
      errorResponse.error = error.message;
      errorResponse.stack = error.stack;
    }

    res.status(500).json(errorResponse);
  }
});


// 🛠 GET maintenance issue summary
router.get("/maintenance-summary", authenticate, async (req, res) => {
  const { facility, dateRange } = req.query;

  try {
    // Step 1: Ensure the requester is an admin
    const userSnap = await admin.firestore().collection("users").doc(req.user.email).get();
    if (!userSnap.exists || userSnap.data().role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    // Step 2: Build query
    let query = admin.firestore().collection("maintenance-reports");

    if (facility) {
      query = query.where("facilityName", "==", facility);
    }

    if (dateRange === "last30days") {
      const now = new Date();
      const past30Days = new Date(now.setDate(now.getDate() - 30));
      query = query.where("createdAt", ">=", past30Days);
    }

    const snapshot = await query.get();

    const issues = snapshot.docs.map((doc) => doc.data());

    // Step 3: Count open vs. closed
    const summary = {
      openCount: 0,
      closedCount: 0,
    };

    const grouped = {};

    for (const issue of issues) {
    
      if (issue.status === "opened") summary.openCount++;
      else if (issue.status === "closed") summary.closedCount++;
    
      if (facility == null) {
        const f = issue.facilityName || "Unknown";
        grouped[f] = grouped[f] || { opened: 0, closed: 0 };
        grouped[f][issue.status] = (grouped[f][issue.status] || 0) + 1;
      }
    }
    

    // Step 4: Return response
    const response = {
      openCount: summary.openCount,
      closedCount: summary.closedCount,
    };

    if (!facility) {
      response.groupedByFacility = grouped;
    }

    return res.json(response);
  } catch (err) {
    console.error("Error fetching maintenance summary:", err);
    res.status(500).json({ message: "Internal server error." });
  }
});

router.get("/maintenance-reports", authenticate, async (req, res) => {
  try {
    const userSnap = await admin.firestore().collection("users").doc(req.user.email).get();

    if (!userSnap.exists || userSnap.data().role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    const snapshot = await admin.firestore().collection("maintenance-reports").get();
    const reports = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({ success: true, reports });
  } catch (error) {
    console.error("Error fetching maintenance reports:", error);
    res.status(500).json({ success: false, message: "Failed to fetch maintenance reports" });
  }
});

router.get("/facilities", authenticate, async (req, res) => {
  try {
    const snapshot = await admin.firestore().collection("facilities-test").get();

    const facilities = snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name,
    }));

    res.status(200).json({ success: true, facilities });
  } catch (error) {
    console.error("Error fetching facilities:", error);
    res.status(500).json({ success: false, message: "Failed to fetch facilities" });
  }
});


module.exports = router;
