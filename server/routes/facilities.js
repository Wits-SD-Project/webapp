//Api endpoints for sports facility related logic
// every call to this api should include credentials (Ask Chat)
const express = require("express");
const router = express.Router();
const { storage } = require("../config/cloudinary");
const multer = require("multer");
const authenticate = require("../authenticate");
const { admin } = require("../firebase");
const { messaging } = require("firebase-admin");

const upload = multer({ storage }); //stores image in RAM temporarily

// Upload facility on database
// When images are being added , have upload.single('image) as input here
router.post("/upload", authenticate, async (req, res) => {
  const { name, type, isOutdoors, availability, location, imageUrls } =
    req.body; // what your api call should send to this api
  console.log(req.body);
  // const img = req.file; for images

  // Checking required fields
  if (!name || !type || typeof isOutdoors === "undefined") {
    return res.status(400).json({
      success: false,
      message: "Missing required fields (name, type, isOutdoors)",
      errorCode: "MISSING_REQUIRED_FIELDS",
    });
  }

  // Validate field types
  if (
    typeof name !== "string" ||
    typeof type !== "string" ||
    typeof isOutdoors !== "boolean"
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid field types",
      errorCode: "INVALID_FIELD_TYPES",
    });
  }

  // Sanitize inputs
  const sanitizedName = name.trim();
  const sanitizedType = type.trim();
  const sanitizedAvailability = availability.trim();

  // Validate string lengths
  if (sanitizedName.length > 100 || sanitizedType.length > 50) {
    return res.status(400).json({
      success: false,
      message: "Name or type exceeds maximum length",
      errorCode: "FIELD_TOO_LONG",
    });
  }

  try {
    // if (!img) {
    //     return res.status(400).json({ message: 'No image uploaded' });
    //   }

    // Check for existing facilities with same name and type
    const facilitiesRef = admin.firestore().collection("facilities-test");
    const snapshot = await facilitiesRef
      .where("name_lower", "==", sanitizedName.toLowerCase())
      .where("type_lower", "==", sanitizedType.toLowerCase())
      .limit(1)
      .get();

    if (!snapshot.empty) {
      return res.status(409).json({
        success: false,
        message: "Facility with this name and type already exists",
        errorCode: "DUPLICATE_FACILITY",
        existingId: snapshot.docs[0].id,
      });
    }

    // Add Facility entry onto Database
    const facilityData = {
      name: sanitizedName,
      name_lower: sanitizedName.toLowerCase(), // For case-insensitive search
      type: sanitizedType,
      type_lower: sanitizedType.toLowerCase(), // For case-insensitive search
      isOutdoors: Boolean(isOutdoors),
      availability: sanitizedAvailability,
      location: location.trim(),
      imageUrls,
      timeslots: [],
      created_by: req.user.uid,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    let docRef;
    try {
      docRef = await admin.firestore().runTransaction(async (transaction) => {
        const duplicateQuery = facilitiesRef
          .where("name_lower", "==", facilityData.name_lower)
          .where("type_lower", "==", facilityData.type_lower)
          .limit(1);

        const duplicateCheck = await transaction.get(duplicateQuery);

        if (!duplicateCheck.empty) {
          throw new Error("DUPLICATE_FACILITY");
        }

        const newDocRef = facilitiesRef.doc();
        transaction.create(newDocRef, facilityData);
        return newDocRef;
      });
    } catch (transactionError) {
      if (transactionError.message === "DUPLICATE_FACILITY") {
        return res.status(409).json({
          success: false,
          message: "Facility already exists",
          errorCode: "DUPLICATE_FACILITY",
        });
      }
      throw transactionError;
    }

    // Fetch newly created facility
    const snapShot = await docRef.get();
    const data = snapShot.data();

    res.status(201).json({
      success: true,
      message: "Facility uploaded successfully",
      facility: {
        id: docRef.id,
        name: data.name,
        type: data.type,
        isOutdoors: data.isOutdoors ? "Yes" : "No",
        availability: data.availability,
        location: data.location,
        imageUrls: data.imageUrls,
      },
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: "Failed to upload facility" });
  }
});

// // Add time slots for a specific facility
// router.post('/slots', authenticate, async (req, res) => {

//     // Validate request body exists
//     if (!req.body || Object.keys(req.body).length === 0) {
//         return res.status(400).json({
//             message: 'Request body is required',
//             errorCode: 'MISSING_BODY'
//         });
//     }

//     // Destructure with default values
//     const {
//         facilityId = null,
//         timeslots = null,
//         isAvailable = true,
//         max_capacity = 1
//     } = req.body;

//     // Validate required fields
//     if (!facilityId || !timeslots) {
//         return res.status(400).json({
//             message: 'facilityId and timeslots are required',
//             errorCode: 'MISSING_REQUIRED_FIELDS',
//             required: ['facilityId', 'timeslots']
//         });
//     }

//     // Validate timeslots is an array
//     if (!Array.isArray(timeslots)) {
//         return res.status(400).json({
//             message: 'timeslots must be an array',
//             errorCode: 'INVALID_TIMESLOTS_FORMAT'
//         });
//     }

//     try {
//         const batch = admin.firestore().batch();// Helps create multiple entries at the same time

//         // Checking if given Facility exists in database
//         const facilityRef = admin.firestore().collection("facilities-test").doc(facilityId);
//         const facilitySnap = await facilityRef.get();

//         if (!facilitySnap.exists) {
//             return res.status(404).json({
//                 message: 'Facility not found',
//                 errorCode: 'FACILITY_NOT_FOUND'
//             });
//         }

//         // Validate timeslot creator
//         if (facilitySnap.data().created_by !== req.user.uid) {
//             return res.status(403).json({
//                 message: 'Unauthorized: Only the facility creator can add timeslots',
//                 errorCode: 'UNAUTHORIZED_ACCESS'
//             });
//         }

//         // Process timeslots
//         for (const [index, slot] of timeslots.entries()) {
//             const [start_time, end_time] = slot || [];

//             if (!start_time || !end_time) {
//                 return res.status(400).json({
//                     message: `Timeslot at index ${index} is missing start_time or end_time`,
//                     errorCode: 'INVALID_TIMESLOT',
//                     index
//                 });
//             }

//             const startDate = new Date(start_time);
//             const endDate = new Date(end_time);

//             if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
//                 return res.status(400).json({
//                     message: `Invalid date format at index ${index}`,
//                     errorCode: 'INVALID_DATE_FORMAT',
//                     index
//                 });
//             }

//             if (startDate >= endDate) {
//                 return res.status(400).json({
//                     message: `Start time must be before end time at index ${index}`,
//                     errorCode: 'INVALID_TIME_RANGE',
//                     index
//                 });
//             }

//             const slotId = `${facilityId}_${startDate.getTime()}_${endDate.getTime()}`;
//             const slotRef = admin.firestore().collection("timeslots-test").doc(slotId);

//             batch.set(slotRef, {
//                 facilityId,
//                 start_time: startDate,
//                 end_time: endDate,
//                 isAvailable: Boolean(isAvailable),
//                 max_capacity: Number(max_capacity),
//                 created_by: req.user.uid,
//                 created_at: admin.firestore.FieldValue.serverTimestamp()
//             });
//         }

//         await batch.commit();
//         res.status(201).json({
//             message: "Timeslots created successfully",
//             count: timeslots.length
//         });

//     } catch (error) {
//         console.error('Timeslot creation error:', error);
//         res.status(500).json({
//             message: 'Failed to create timeslots',
//             errorCode: 'SERVER_ERROR',
//             error: process.env.NODE_ENV === 'development' ? error.message : undefined
//         });
//     }
// });

// Get timeslots for a facility
// In your facilities routes file
router.post("/timeslots", authenticate, async (req, res) => {
  try {
    const { facilityId } = req.body;
    const facilityRef = admin
      .firestore()
      .collection("facilities-test")
      .doc(facilityId);
    const doc = await facilityRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: "Facility not found",
      });
    }

    const facilityData = doc.data();
    res.json({
      success: true,
      timeslots: facilityData.timeslots || [], // Return array instead of object
      message: "Timeslots fetch successful",
    });
  } catch (err) {
    console.error("Failed to fetch timeslots:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch timeslots",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// Fetch all facilities created by Facility staff
router.get("/staff-facilities", authenticate, async (req, res) => {
  try {
    // 1. Query facilities created by the current user
    const snapshot = await admin
      .firestore()
      .collection("facilities-test")
      .where("created_by", "==", req.user.uid)
      .get();

    // 2. Format response data
    const facilities = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        type: data.type,
        isOutdoors: data.isOutdoors ? "Yes" : "No",
        availability: data.availability,
      };
    });

    // 3. Success response
    res.json({
      success: true,
      count: facilities.length,
      facilities,
    });
  } catch (err) {
    console.error("Failed to fetch staff facilities:", err);

    // 4. Error handling
    const errorResponse = {
      success: false,
      message: "Failed to fetch facilities",
      errorCode: "FETCH_ERROR",
    };

    // Add debug info in development
    if (process.env.NODE_ENV === "development") {
      errorResponse.error = err.message;
      errorResponse.stack = err.stack;
    }

    res.status(500).json(errorResponse);
  }
});

// DELETE /api/facilities/:id
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const docRef = admin.firestore().collection("facilities-test").doc(id);
    const snap = await docRef.get();

    if (!snap.exists) {
      return res.status(404).json({
        success: false,
        message: "Facility not found",
        errorCode: "FACILITY_NOT_FOUND",
      });
    }

    // Verify ownership
    if (snap.data().created_by !== req.user.uid) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: You don't own this facility",
        errorCode: "OWNERSHIP_MISMATCH",
      });
    }

    // Delete facility and its timeslots
    const batch = admin.firestore().batch();

    // 1. Delete facility
    batch.delete(docRef);

    // 2. Delete associated timeslots
    const timeslotsQuery = admin
      .firestore()
      .collection("timeslots-test")
      .where("facilityId", "==", id);

    const timeslotsSnapshot = await timeslotsQuery.get();
    timeslotsSnapshot.forEach((doc) => batch.delete(doc.ref));

    await batch.commit();

    res.json({
      success: true,
      message: "Facility and associated timeslots deleted",
    });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({
      success: false,
      message: "Delete failed",
      errorCode: "SERVER_ERROR",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

//   // PUT /api/facilities/:id
// router.put('/:id', authenticate, async (req, res) => {
//     try {
//       const { id } = req.params;
//       const updates = req.body;
//       const docRef = admin.firestore().collection("facilities-test").doc(id);
//       const snap = await docRef.get();
//       if (!snap.exists) return res.status(404).json({ message: "Not found" });
//       if (snap.data().created_by !== req.user.uid) {
//         return res.status(403).json({ message: "Unauthorized" });
//       }

//       // you may want to whitelist allowed fields:
//       const allowed = ["name","type","isOutdoors","availability"];
//       const data = {};
//       for (let k of allowed) if (k in updates) data[k] = updates[k];

//       await docRef.update(data);
//       res.json({ success: true, updated: data });
//     } catch (err) {
//       console.error(err);
//       res.status(500).json({ message: "Update failed" });
//     }
// });

// Update a facility (staff only)
router.put("/updateFacility/:id", authenticate, async (req, res) => {
  try {
    const facilityId = req.params.id;
    const { name, type, isOutdoors, availability } = req.body;

    // 1. Get reference to the facility
    const facilityRef = admin
      .firestore()
      .collection("facilities-test")
      .doc(facilityId);

    // 2. Verify facility exists and belongs to user
    const doc = await facilityRef.get();
    if (!doc.exists || doc.data().created_by !== req.user.uid) {
      return res.status(404).json({
        success: false,
        message: "Facility not found or unauthorized",
      });
    }

    // 3. Prepare update data
    const updateData = {
      name,
      type,
      isOutdoors: Boolean(isOutdoors),
      availability,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // 4. Perform update
    await facilityRef.update(updateData);

    // 5. Return updated facility
    const updatedDoc = await facilityRef.get();
    const data = updatedDoc.data();

    res.json({
      success: true,
      facility: {
        id: facilityId,
        name: data.name,
        type: data.type,
        isOutdoors: data.isOutdoors ? "Yes" : "No",
        availability: data.availability,
      },
      message: "Facility updated successfully",
    });
  } catch (err) {
    console.error("Failed to update facility:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update facility",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

router.put("/:id/timeslots", async (req, res) => {
  try {
    const facilityId = req.params.id;
    const { timeslots } = req.body;

    if (!timeslots || typeof timeslots !== "object") {
      return res
        .status(400)
        .json({ message: "Invalid or missing timeslots object" });
    }

    const isValidTime = (str) => /^\d{2}:\d{2}$/.test(str);
    const timeToMinutes = (time) => {
      const [h, m] = time.split(":").map(Number);
      return h * 60 + m;
    };

    const seenSlots = new Set();
    const formattedSlots = [];

    for (const [day, slots] of Object.entries(timeslots)) {
      if (!Array.isArray(slots)) {
        return res
          .status(400)
          .json({ message: `Invalid slot list for ${day}` });
      }

      const daySlots = [];

      for (const slotStr of slots) {
        const [start, end] = slotStr.split(" - ").map((t) => t.trim());

        if (!isValidTime(start) || !isValidTime(end)) {
          return res
            .status(400)
            .json({ message: `Invalid time format in slot: "${slotStr}"` });
        }

        const startMin = timeToMinutes(start);
        const endMin = timeToMinutes(end);

        if (startMin >= endMin) {
          return res.status(400).json({
            message: `Start time must be before end time in slot: "${slotStr}"`,
          });
        }

        const slotKey = `${day}-${start}-${end}`;
        if (seenSlots.has(slotKey)) {
          return res.status(400).json({
            message: `Duplicate slot detected: "${slotStr}" on ${day}`,
          });
        }

        // Check overlap with existing slots on the same day
        for (const existing of daySlots) {
          const eStart = timeToMinutes(existing.start);
          const eEnd = timeToMinutes(existing.end);
          const overlap = startMin < eEnd && endMin > eStart;

          if (overlap) {
            return res.status(400).json({
              message: `Overlapping slot detected on ${day}: "${slotStr}" conflicts with "${existing.start} - ${existing.end}"`,
            });
          }
        }

        const newSlot = {
          day,
          start,
          end,
          isBooked: false,
          bookedBy: null,
        };

        daySlots.push(newSlot);
        formattedSlots.push(newSlot);
        seenSlots.add(slotKey);
      }
    }

    const facilityRef = admin
      .firestore()
      .collection("facilities-test")
      .doc(facilityId);
    const facilitySnap = await facilityRef.get();

    if (!facilitySnap.exists) {
      return res.status(404).json({ message: "Facility not found" });
    }

    await facilityRef.update({ timeslots: formattedSlots });

    return res.status(200).json({ message: "Timeslots updated successfully" });
  } catch (err) {
    console.error("Error updating timeslots:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// DELETE Timeslot
router.delete("/:id/timeslots", authenticate, async (req, res) => {
  try {
    const facilityId = req.params.id;
    const { day, start, end } = req.body;

    // Validate input
    if (!day || !start || !end) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters: day, start, end",
        errorCode: "MISSING_PARAMETERS",
      });
    }

    const facilityRef = admin
      .firestore()
      .collection("facilities-test")
      .doc(facilityId);
    const doc = await facilityRef.get();

    if (!doc.exists) {
      return res.status(404).json({
        success: false,
        message: "Facility not found",
        errorCode: "FACILITY_NOT_FOUND",
      });
    }

    if (doc.data().created_by !== req.user.uid) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
        errorCode: "UNAUTHORIZED",
      });
    }
    const currentTimeslots = doc.data().timeslots || [];
    const initialCount = currentTimeslots.length;

    const updatedTimeslots = currentTimeslots.filter(
      (slot) => !(slot.day === day && slot.start === start && slot.end === end)
    );

    if (initialCount === updatedTimeslots.length) {
      return res.status(404).json({
        success: false,
        message: "Timeslot not found",
        errorCode: "TIMESLOT_NOT_FOUND",
      });
    }

    await facilityRef.update({ timeslots: updatedTimeslots });

    res.json({
      success: true,
      message: "Timeslot deleted successfully",
      removedSlot: { day, start, end },
      remainingCount: updatedTimeslots.length,
    });
  } catch (err) {
    console.error("Delete timeslot error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      errorCode: "SERVER_ERROR",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

router.post("/bookings", authenticate, async (req, res) => {
  try {
    const { facilityId, facilityName, slot, selectedDate } = req.body;
    const userId = req.user.uid;

    if (!facilityId || !facilityName || !slot || !selectedDate) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const bookingsRef = admin.firestore().collection("bookings");

    // Check if the user has already booked this slot on the selected date
    const duplicateBookingSnap = await bookingsRef
      .where("facilityId", "==", facilityId)
      .where("date", "==", selectedDate)
      .where("slot", "==", slot)
      .where("userId", "==", userId)
      .get();

    if (!duplicateBookingSnap.empty) {
      return res.status(409).json({
        success: false,
        message: "You have already booked this slot.",
      });
    }

    // Check if the slot is fully booked
    const existingBookingsSnap = await bookingsRef
      .where("facilityId", "==", facilityId)
      .where("date", "==", selectedDate)
      .where("slot", "==", slot)
      .get();

    const currentBookings = existingBookingsSnap.size;

    if (currentBookings >= 1) {
      return res
        .status(409)
        .json({ success: false, message: "This slot is fully booked" });
    }

    const docRef = admin
      .firestore()
      .collection("facilities-test")
      .doc(facilityId);
    const doc = await docRef.get();
    const staffID = doc.data().created_by;

    // If under capacity and not a duplicate, create new booking
    await bookingsRef.add({
      facilityId,
      facilityName,
      userId,
      userName: req.user.name || req.user.email,
      slot,
      date: selectedDate,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      facilityStaff: staffID,
    });

    res.status(201).json({ success: true, message: "Booking confirmed" });
  } catch (err) {
    console.error("Booking error:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to complete booking" });
  }
});

// fetch all maintenance reports made to facilities created by a facility staff
router.get("/staff-maintenance-requests",authenticate,async (req,res) =>{
  try {
    // 1. Query facilities created by the current user
    const snapshot = await admin
      .firestore()
      .collection("maintenance-reports")
      .where("facilityStaff", "==", req.user.uid)
      .get();

    // 2. Format response data
    const reports = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        facilityName: data.facilityName,
        reportedBy: data.username,
        description: data.description,
        status: data.status,
        reportedAt: data.createdAt.toDate().toISOString()
      };
    });

    // 3. Success response
    res.json({
      success: true,
      reports,
    });
  } catch (err) {
    console.error("Failed to fetch staff maintenance reports:", err);

    // 4. Error handling
    const errorResponse = {
      success: false,
      message: "Failed to fetch staff maintenance reports",
      errorCode: "FETCH_ERROR",
    };

    // Add debug info in development
    if (process.env.NODE_ENV === "development") {
      errorResponse.error = err.message;
      errorResponse.stack = err.stack;
    }

    res.status(500).json(errorResponse);
  }

  // Update maintenance report status
  router.put("/updateReportStatus/:id",authenticate, async (req, res) => {
    try {
      const reportId = req.params.id;
      const { status } = req.body;
  
      // 1. Get reference to the maintenance report
      const reportRef = admin
        .firestore()
        .collection("maintenance-reports")
        .doc(reportId);
  
      // 2. Verify report exists and is for a facility created by user
      const doc = await reportRef.get();
      if (!doc.exists || doc.data().facilityStaff !== req.user.uid ) {
        return res.status(404).json({
          success: false,
          message: "Report not found or unauthorized",
        });
      }
  
      // 3. Prepare update data
      const updateData = {
        status:status
      };
  
      // 4. Perform update
      await reportRef.update(updateData);
  
      // 5. Return updated facility
      const updatedDoc = await reportRef.get();
      const data = updatedDoc.data();
  
      res.json({
        success: true,
        report: {
          id: doc.id,
          facilityName: data.facilityName,
          reportedBy: data.username,
          description: data.description,
          status: data.status,
          reportedAt: data.createdAt.toDate().toISOString()
        },
        message: "Report updated successfully",
      });
    } catch (err) {
      console.error("Failed to update Report:", err);
      res.status(500).json({
        success: false,
        message: "Failed to update Report",
        error: process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  });

});



module.exports = router;
