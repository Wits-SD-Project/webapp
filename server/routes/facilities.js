
/* ------------------------------------------------------------------
   routes/facilities.js   – sports-facility endpoints (staff role)
   ------------------------------------------------------------------ */

   const express      = require('express');
   const multer       = require('multer');
   const { storage }  = require('../config/cloudinary');
   const authenticate = require('../authenticate');
   const { admin }    = require('../firebase');
   
   const router = express.Router();
   const upload = multer({ storage });               // kept for future images
   
   /* ──────────────  POST /facilities/upload  – create a facility  ──────────────
      • A single staff user may not create two facilities with identical
        (name + type). Different staff may reuse the same pair.                  */
   router.post('/upload', authenticate, async (req, res) => {
    /* 1️⃣ basic validation ---------------------------------------------------- */
    const { 
        name, 
        type, 
        isOutdoors, 
        availability, 
        location, 
        imageUrls,
        description = '',  // New field with default
        features = []      // New field with default
    } = req.body;

    if (!name || !type || typeof isOutdoors === 'undefined')
        return res.status(400).json({
            success: false,
            message: 'Missing required fields (name, type, isOutdoors)',
            errorCode: 'MISSING_REQUIRED_FIELDS',
        });

    if (typeof name !== 'string' || typeof type !== 'string' || typeof isOutdoors !== 'boolean')
        return res.status(400).json({
            success: false,
            message: 'Invalid field types',
            errorCode: 'INVALID_FIELD_TYPES',
        });

    // Validate new fields
    if (description && typeof description !== 'string') {
        return res.status(400).json({
            success: false,
            message: 'Description must be a string',
            errorCode: 'INVALID_DESCRIPTION',
        });
    }

    if (features && (!Array.isArray(features) || features.some(f => typeof f !== 'string'))) {
        return res.status(400).json({
            success: false,
            message: 'Features must be an array of strings',
            errorCode: 'INVALID_FEATURES',
        });
    }

    const cleanName = name.trim();
    const cleanType = type.trim();
    const cleanDescription = description.trim();
    
    if (cleanName.length > 100 || cleanType.length > 50)
        return res.status(400).json({
            success: false,
            message: 'Name or type exceeds maximum length',
            errorCode: 'FIELD_TOO_LONG',
        });

    if (cleanDescription.length > 500) {
        return res.status(400).json({
            success: false,
            message: 'Description exceeds maximum length of 500 characters',
            errorCode: 'DESCRIPTION_TOO_LONG',
        });
    }

    /* 2️⃣ build payload ------------------------------------------------------- */
    const facilities = admin.firestore().collection('facilities-test');
    const payload = {
        name: cleanName,
        name_lower: cleanName.toLowerCase(),
        type: cleanType,
        type_lower: cleanType.toLowerCase(),
        isOutdoors,
        availability: availability ? availability.trim() : '',
        location: location ? location.trim() : '',
        imageUrls: imageUrls || [],
        description: cleanDescription,
        features: features || [],
        timeslots: [],
        created_by: req.user.uid,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    try {
        /* 3️⃣ duplicate guard (creator-scoped) ---------------------------------- */
        const snap = await facilities.where('created_by', '==', req.user.uid).get();

        let duplicate = false;
        snap.forEach((d) => {
            const f = d.data();
            if (f.name_lower === payload.name_lower && f.type_lower === payload.type_lower) {
                duplicate = true;
            }
        });

        if (duplicate) {
            return res.status(409).json({
                success: false,
                message: 'Facility with this name and type already exists',
                errorCode: 'DUPLICATE_FACILITY',
            });
        }

        /* 4️⃣ create the document  --------------------------------------------- */
        const docRef = await facilities.add(payload);
            
        /* 5️⃣ success ----------------------------------------------------------- */
        const saved = (await docRef.get()).data();
        
        // Maintain backward compatible response
        const response = {
            success: true,
            facility: {
                id: docRef.id,
                name: saved.name,
                type: saved.type,
                isOutdoors: saved.isOutdoors ? 'Yes' : 'No',
                availability: saved.availability,
                location: saved.location,
                imageUrls: saved.imageUrls,
                // Include new fields in response if they exist
                ...(saved.description && { description: saved.description }),
                ...(saved.features && saved.features.length > 0 && { features: saved.features }),
            },
        };

        return res.status(201).json(response);
    } catch (err) {
        if (err.message === 'DUPLICATE_FACILITY')
            return res.status(409).json({
                success: false,
                message: 'Facility already exists',
                errorCode: 'DUPLICATE_FACILITY',
            });
        console.error('Facility upload error:', err);
        return res.status(500).json({ 
            success: false, 
            message: 'Server error',
            errorDetails: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});
   
   /* ───────────────────────  POST /facilities/timeslots  ─────────────────────── */
   router.post('/timeslots', authenticate, async (req, res) => {
     try {
       const { facilityId } = req.body;
       const snap = await admin.firestore().collection('facilities-test').doc(facilityId).get();
       if (!snap.exists)
         return res.status(404).json({ success: false, message: 'Facility not found' });
   
       res.json({
         success  : true,
         message  : 'Timeslots fetch successful',
         timeslots: snap.data().timeslots || [],
       });
     } catch (e) {
       console.error('Timeslot fetch error:', e);
       res.status(500).json({ success: false, message: 'Server error' });
     }
   });
   
   /* ──────────────────  GET /facilities/staff-facilities  ────────────────────── */
   router.get('/staff-facilities', authenticate, async (req, res) => {
     try {
       const docs = await admin
         .firestore()
         .collection('facilities-test')
         .where('created_by', '==', req.user.uid)
         .get();
   
       const facilities = docs.docs.map((d) => {
         const f = d.data();
         return {
           id          : d.id,
           name        : f.name,
           type        : f.type,
           isOutdoors  : f.isOutdoors ? 'Yes' : 'No',
           availability: f.availability,
         };
       });
   
       res.json({ success: true, count: facilities.length, facilities });
     } catch (e) {
       console.error('staff-facilities error:', e);
       res.status(500).json({ success: false, message: 'Server error' });
     }
   });
   
   /* ──────────────────  PUT /facilities/updateFacility/:id  ──────────────────── */
  router.put('/updateFacility/:id', authenticate, async (req, res) => {
    try {
        const ref = admin.firestore().collection('facilities-test').doc(req.params.id);
        const snap = await ref.get();
        
        if (!snap.exists || snap.data().created_by !== req.user.uid) {
            return res.status(404).json({ 
                success: false, 
                message: 'Facility not found or unauthorized' 
            });
        }

        const { 
            name, 
            type, 
            isOutdoors, 
            availability, 
            description, 
            features 
        } = req.body;

        // Validate basic fields
        if (!name || !type || typeof isOutdoors === 'undefined') {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields (name, type, isOutdoors)',
                errorCode: 'MISSING_REQUIRED_FIELDS',
            });
        }

        // Validate new fields if provided
        if (description && typeof description !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Description must be a string',
                errorCode: 'INVALID_DESCRIPTION',
            });
        }

        if (features && (!Array.isArray(features) || features.some(f => typeof f !== 'string'))) {
            return res.status(400).json({
                success: false,
                message: 'Features must be an array of strings',
                errorCode: 'INVALID_FEATURES',
            });
        }

        // Prepare update data
        const updateData = {
            name: name.trim(),
            type: type.trim(),
            isOutdoors: Boolean(isOutdoors),
            availability: availability ? availability.trim() : '',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // Only update description if provided
        if (typeof description !== 'undefined') {
            updateData.description = description.trim();
        }

        // Only update features if provided
        if (typeof features !== 'undefined') {
            updateData.features = features;
        }

        await ref.update(updateData);

        const updated = (await ref.get()).data();
        
        // Backward compatible response with new fields
        const response = {
            success: true,
            facility: {
                id: ref.id,
                name: updated.name,
                type: updated.type,
                isOutdoors: updated.isOutdoors ? 'Yes' : 'No',
                availability: updated.availability,
                // Include new fields if they exist
                ...(updated.description && { description: updated.description }),
                ...(updated.features && { features: updated.features }),
            },
        };

        res.json(response);
    } catch (e) {
        console.error('Update facility error:', e);
        res.status(500).json({ 
            success: false, 
            message: 'Server error',
            ...(process.env.NODE_ENV === 'development' && { error: e.message })
        });
    }
});
   
   /* ─────────────────────  DELETE /facilities/:id  ───────────────────────────── */
   router.delete('/:id', authenticate, async (req, res) => {
     try {
       const ref  = admin.firestore().collection('facilities-test').doc(req.params.id);
       const snap = await ref.get();
       if (!snap.exists)
         return res.status(404).json({ success: false, message: 'Facility not found' });
       if (snap.data().created_by !== req.user.uid)
         return res.status(403).json({ success: false, message: 'Unauthorized' });
   
       const batch = admin.firestore().batch();
       batch.delete(ref);
   
       const tsDocs = await admin
         .firestore()
         .collection('timeslots-test')
         .where('facilityId', '==', req.params.id)
         .get();
       tsDocs.forEach((d) => batch.delete(d.ref));
   
       await batch.commit();
       res.json({ success: true, message: 'Facility and timeslots deleted' });
     } catch (e) {
       console.error('Delete facility error:', e);
       res.status(500).json({ success: false, message: 'Server error' });
     }
   });
   
   /* ▼▼  ALL ROUTES BELOW THIS COMMENT ARE UNCHANGED FROM YOUR ORIGINAL FILE ▼▼ */
   
   /* --------------------------------------------------------------------------
      PUT /facilities/:id/timeslots  – update weekly template (unchanged)
   -------------------------------------------------------------------------- */
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
   
   /* --------------------------------------------------------------------------
      DELETE /facilities/:id/timeslots  – delete a single slot (unchanged)
   -------------------------------------------------------------------------- */
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
  
   
   /* --------------------------------------------------------------------------
      POST /facilities/bookings  – make a booking (unchanged)
   -------------------------------------------------------------------------- */
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
  
      // Check if the slot is fully booked or blocked 
      const existingBookingsSnap = await bookingsRef
        .where("facilityId", "==", facilityId)
        .where("date", "==", selectedDate)
        .where("slot", "==", slot)
        .get();
  
      const currentBookings = existingBookingsSnap.size;
  
      if (currentBookings >= 200) {
        return res
          .status(409)
          .json({ success: false, message: "This slot is fully booked" });
      }else{
        
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
  
   
   /* --------------------------------------------------------------------------
      GET /facilities/staff-maintenance-requests (unchanged)
      PUT /facilities/updateReportStatus/:id          (unchanged)
   -------------------------------------------------------------------------- */
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
   });
   
   /* inner PUT inside previous route – keep as-is */
   router.put("/updateReportStatus/\:id",authenticate, async (req, res) => {
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
   /* ------------------------------------------------------------------ */
   module.exports = router;
   