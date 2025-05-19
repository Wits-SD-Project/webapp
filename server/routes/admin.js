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

    const { eventName, facilityName,facilityId, description, startTime, endTime ,posterImage} =
      req.body;

    // === Step 1: Validate input ===
    if (
      !eventName ||
      typeof eventName !== "string" ||!facilityName ||
      typeof facilityName !== "string" ||
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
      facilityId,
      facilityName,
      description,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      posterImage: posterImage || null, // New field
      createdBy: req.user.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const responseEvent = {
      id: newEventDoc.id,
      eventName,
      facility: {
        id: facilityId,
        name: facilityName,
      },
      description,
      startTime: start,
      endTime: end,
      posterImage: posterImage || null, // Include in response
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
    const { 
      eventName, 
      facilityName, 
      facilityId, 
      description, 
      startTime, 
      endTime,
      posterImage // Add new field
    } = req.body;

    // === Step 1: Validate input ===
    if (
      !eventName ||
      typeof eventName !== "string" ||
      !facilityName ||
      typeof facilityName !== "string" ||
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
      facilityName,
      facilityId,
      description,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      // Add posterImage if provided, otherwise maintain existing
      ...(posterImage !== undefined && { posterImage })
    });

    const updatedEvent = {
      id: eventId,
      eventName,
      facility: {
        id: facilityId,
        name: facilityName,
      },
      description,
      startTime: start,
      endTime: end,
      posterImage: posterImage || existingSnap.data().posterImage || null, // Maintain backward compatibility
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
router.get('/events', async (req, res) => {
  try {
    const snap = await admin.firestore().collection('admin-events').orderBy('startTime').get();

    const events = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((e) => e.eventName && e.startTime) // ignore stray mock docs
      .map((e) => ({
        id: e.id,
        eventName: e.eventName,
        facility: { id: e.facilityId, name: e.facilityName || e.facility || 'Unknown Facility' },
        description: e.description,
        startTime: new Date(e.startTime),
        endTime: new Date(e.endTime),
        posterImage: e.posterImage || null, // Add to response
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

router.post('/events/notify', async (req, res) => {
   const formatDateTime = (date) => {
    if (!date) return "";
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  try {
    const { eventId, eventName, facilityName, startTime, endTime } = req.body;


    // Validate required fields
    if (!eventId || !eventName || !facilityName || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields for notification',
      });
    }

    // Fetch all residents
    const usersSnapshot = await admin.firestore()
      .collection('users')
      .where('role', '==', 'resident')
      .get();

    if (usersSnapshot.empty) {
      return res.status(200).json({
        success: true,
        message: 'No residents found to notify',
      });
    }

    // Prepare batch notification creation
    const batch = admin.firestore().batch();
    const notificationsRef = admin.firestore().collection('notifications');

    usersSnapshot.forEach(docSnap => {
      const resident = docSnap.data();
      const newNotificationRef = notificationsRef.doc();

      const notificationData = {
        createdAt: new Date().toISOString(),
        facilityName: facilityName || 'Unknown Facility',
        slot: `${formatDateTime(new Date(startTime))} - ${formatDateTime(new Date(endTime))}`,
        status: "new-event",
        eventName: eventName || 'New Event',
        userName: resident.email || 'unknown@email.com',
        read: false,
        type: "event",
        startTime,
        endTime,
        eventId
      };

      // Optional: Remove undefined values
      Object.keys(notificationData).forEach(key => {
        if (notificationData[key] === undefined) {
          delete notificationData[key];
        }
      });

      batch.set(newNotificationRef, notificationData, { ignoreUndefinedProperties: true });
    });

    // Commit batch
    await batch.commit();

    res.status(200).json({
      success: true,
      message: `Notifications sent to ${usersSnapshot.size} residents`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send notifications',
      error: error.message
    });
  }
});

router.get('/upcoming', authenticate, async (req, res) => {
  try {
    const snapshot = await admin.firestore()
      .collection('admin-events')
      .get();

    const now = new Date().toISOString(); // Current time as ISO string
    const events = [];

    snapshot.forEach(doc => {
      const eventData = doc.data();
      
      // Since times are already ISO strings, we can use them directly
      events.push({
        id: doc.id,
        ...eventData,
        // No need to convert timestamps
        startTime: eventData.startTime,
        endTime: eventData.endTime
      });
    });

    // Filter for upcoming events (compare ISO strings directly)
    const upcomingEvents = events.filter(event => 
      event.startTime && event.startTime > now
    );

    res.json({ events: upcomingEvents });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

router.get('/unread-count',authenticate, async (req, res) => {
  try {
    const userEmail = req.user.email; // Assuming you have auth middleware
    const notificationsRef = admin.firestore().collection('notifications');
    
    const snapshot = await notificationsRef
      .where('userName', '==', userEmail)
      .where('read', '==', false)
      .get();

    res.json({ count: snapshot.size });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Hourly bookings data
// server/routes/admin.js

// Hourly bookings data
router.get('/hourly-bookings', authenticate, async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const bookingsSnapshot = await admin.firestore()
      .collection('bookings')
      // Assuming you've also fixed Issue 1 (using 'date' field and correct comparison)
      // For example, if 'date' is "YYYY-MM-DD":
      .where('date', '>=', sevenDaysAgo.toISOString().split('T')[0])
      .get();

    const hourlyCounts = Array(12).fill(0).map((_, i) => {
      const hour = i + 6; // From 6 AM to 5 PM
      return { hour: `${hour} ${hour < 12 ? 'AM' : 'PM'}`, bookings: 0 };
    });

    bookingsSnapshot.forEach(doc => {
      const booking = doc.data();
      if (booking.date && booking.slot) { // Ensure necessary fields exist
        try {
          const slotStartTime = booking.slot.split(' - ')[0]; // Get "09:00" from "09:00 - 10:00"
          // Construct a full ISO-like string that new Date() can parse reliably
          const bookingDateTimeString = `${booking.date}T${slotStartTime}:00`;
          const bookingDateObject = new Date(bookingDateTimeString);

          if (!isNaN(bookingDateObject.getTime())) { // Check if the date is valid
            const hour = bookingDateObject.getHours(); // This will now be the correct hour

            // Your existing logic to map to displayHour and hourLabel
            const displayHour = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour); // Handle midnight as 12 AM
            const period = hour < 12 || hour === 24 ? 'AM' : 'PM'; // Adjust period for midnight/noon if needed
            // Ensure consistent hour formatting in hourLabel, especially for single-digit hours if not padded
            // The hourlyCounts array uses non-padded hours like "6 AM", "7 AM" etc.
            const hourLabel = `${displayHour} ${period}`;

            const hourIndex = hourlyCounts.findIndex(h => h.hour === hourLabel);
            if (hourIndex !== -1) {
              hourlyCounts[hourIndex].bookings++;
            } else {
              // This might happen if a booking hour is outside your 6 AM - 5 PM window
              // Or if the hourLabel formatting here doesn't exactly match what's in hourlyCounts
              console.warn(`Could not find hourIndex for hourLabel: ${hourLabel} from booking hour: ${hour}`);
            }
          } else {
            console.warn(`Could not parse date for booking ID ${doc.id}: ${bookingDateTimeString}`);
          }
        } catch (e) {
          console.warn(`Error processing slot for booking ID ${doc.id}: ${booking.slot}`, e);
        }
      }
    });

    res.json({ hourlyBookings: hourlyCounts });
  } catch (error) {
    console.error('Error fetching hourly bookings:', error);
    res.status(500).json({ error: 'Failed to fetch hourly bookings' });
  }
});
// ------------------------------
// [2] Top Facilities
// ------------------------------
router.get('/top-facilities', authenticate, async (req, res) => {
  console.log('[GET] /top-facilities accessed');
  try {
    const facilitiesSnapshot = await admin.firestore()
      .collection('facilities-test')
      .get();

    console.log(`Fetched ${facilitiesSnapshot.size} facilities`);

    const bookingCounts = await Promise.all(
      facilitiesSnapshot.docs.map(async doc => {
        const bookings = await admin.firestore()
          .collection('bookings')
          .where('facilityId', '==', doc.id)
          .get();
        console.log(`Facility "${doc.data().name}" has ${bookings.size} bookings`);
        return {
          name: doc.data().name,
          bookings: bookings.size
        };
      })
    );

    const topFacilities = bookingCounts
      .sort((a, b) => b.bookings - a.bookings)
      

    console.log('Top 4 facilities:', topFacilities);
    res.json({ topFacilities });
  } catch (error) {
    console.error('Error fetching top facilities:', error);
    res.status(500).json({ error: 'Failed to fetch top facilities' });
  }
});

// ------------------------------
// [3] Daily Bookings
// ------------------------------
router.get('/daily-bookings', authenticate, async (req, res) => {
  console.log('[GET] /daily-bookings accessed');
  try {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dailyCounts = days.map(day => ({ day, bookings: 0 }));

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    console.log('Fetching bookings from:', sevenDaysAgo.toISOString());

    const bookingsSnapshot = await admin.firestore()
      .collection('bookings')
      .where('date', '>=', sevenDaysAgo.toISOString())
      .get();

    console.log(`Fetched ${bookingsSnapshot.size} bookings`);

    bookingsSnapshot.forEach(doc => {
      const date = new Date(doc.data().date);
      const dayIndex = date.getDay();
      dailyCounts[dayIndex].bookings++;
      console.log(`Booking on ${days[dayIndex]} (index ${dayIndex})`);
    });

    console.log('Daily bookings breakdown:', dailyCounts);
    res.json({ dailyBookings: dailyCounts });
  } catch (error) {
    console.error('Error fetching daily bookings:', error);
    res.status(500).json({ error: 'Failed to fetch daily bookings' });
  }
});

// ------------------------------
// [4] Summary Statistics
// ------------------------------
router.get('/summary-stats', authenticate, async (req, res) => {
  console.log('[GET] /summary-stats accessed');
  try {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    startOfWeek.setHours(0, 0, 0, 0);
    console.log('Start of week:', startOfWeek.toISOString());

    const bookingsThisWeek = await admin.firestore()
      .collection('bookings')
      .where('date', '>=', startOfWeek.toISOString())
      .get();

    console.log(`Total bookings this week: ${bookingsThisWeek.size}`);

    const facilities = await admin.firestore().collection('facilities-test').get();
    console.log(`Fetched ${facilities.size} facilities`);

    const facilityBookings = await Promise.all(
      facilities.docs.map(async doc => {
        const bookings = await admin.firestore()
          .collection('bookings')
          .where('facilityId', '==', doc.id)
          .get();
        console.log(`Facility "${doc.data().name}" has ${bookings.size} bookings`);
        return {
          name: doc.data().name,
          count: bookings.size
        };
      })
    );

    const mostUsedFacility = facilityBookings.sort((a, b) => b.count - a.count)[0];
    console.log('Most used facility:', mostUsedFacility);
const hourlyBookings = Array(12).fill(0).map((_, i) => {
      const hour = i + 6; // From 6 AM to 5 PM
      return { hour: `${hour} ${hour < 12 ? 'AM' : 'PM'}`, bookings: 0 };
    });

    bookingsThisWeek.forEach(doc => {
      const bookingData = doc.data();
      if (bookingData.date && bookingData.slot) { // Ensure necessary fields exist
        try {
          const slotStartTime = bookingData.slot.split(' - ')[0]; // "09:00"
          const bookingDateTimeString = `${bookingData.date}T${slotStartTime}:00`;
          const bookingDateObject = new Date(bookingDateTimeString);

          if (!isNaN(bookingDateObject.getTime())) { // Check if the date is valid
            const hour = bookingDateObject.getHours();

            if (hour >= 6 && hour <= 17) { // Only count hours between 6AM and 5PM
              const displayHour = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
              const period = hour < 12 || hour === 24 ? 'AM' : 'PM';
              const hourLabel = `${displayHour} ${period}`;

              const hourIndex = hourlyBookings.findIndex(h => h.hour === hourLabel);
              if (hourIndex !== -1) {
                hourlyBookings[hourIndex].bookings++;
              } else {
                 console.warn(`Summary: Could not find hourIndex for hourLabel: ${hourLabel} from booking hour: ${hour}`);
              }
            }
          } else {
            console.warn(`Summary: Could not parse date for booking ID ${doc.id}: ${bookingDateTimeString}`);
          }
        } catch (e) {
          console.warn(`Summary: Error processing slot for booking ID ${doc.id}: ${bookingData.slot}`, e);
        }
      }
    });

    const sortedHourlyBookings = [...hourlyBookings].sort((a, b) => b.bookings - a.bookings);
    const peakHour = sortedHourlyBookings.length > 0 && sortedHourlyBookings[0].bookings > 0
                     ? sortedHourlyBookings[0].hour
                     : "No data";

    res.json({
      totalBookings: bookingsThisWeek.size,
      mostUsedFacility: mostUsedFacility?.name || "No data",
      peakHour: peakHour || "No data"
    });
  } catch (error) {
    console.error('Error fetching summary stats:', error);
    res.status(500).json({
      error: 'Failed to fetch summary stats',
      details: error.message
    });
  }
});


module.exports = router;
