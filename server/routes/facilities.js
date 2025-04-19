//Api endpoints for sports facility related logic
// every call to this api should include credentials (Ask Chat)
const express = require("express");
const router = express.Router();
const { storage } = require('../config/cloudinary');
const multer = require('multer');
const authenticate = require('../authenticate')
const { admin } = require("../firebase");

const upload = multer({storage}); //stores image in RAM temporarily

// Upload facility on database
// When images are being added , have upload.single('image) as input here
router.post('/upload', authenticate, async (req, res) => {
    const { name, type ,isOutdoors,availability} = req.body; // what your api call should send to this api 
    // const img = req.file; for images

    // Checking required fields
    if (!name || !type || typeof isOutdoors === 'undefined') {
        return res.status(400).json({
            success: false,
            message: "Missing required fields (name, type, isOutdoors)",
            errorCode: "MISSING_REQUIRED_FIELDS"
        });
    }

    // Validate field types
    if (typeof name !== 'string' || 
        typeof type !== 'string' ||
        typeof isOutdoors !== 'boolean') {
        return res.status(400).json({
            success: false,
            message: "Invalid field types",
            errorCode: "INVALID_FIELD_TYPES"
        });
    }

    // Sanitize inputs
    const sanitizedName = name.trim();
    const sanitizedType = type.trim();
    const sanitizedAvailability =  availability.trim();

    // Validate string lengths
    if (sanitizedName.length > 100 || sanitizedType.length > 50) {
        return res.status(400).json({
            success: false,
            message: "Name or type exceeds maximum length",
            errorCode: "FIELD_TOO_LONG"
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
                 existingId: snapshot.docs[0].id
             });
         }

        // Add Facility entry onto Database
        const facilityData = {
            name: sanitizedName,
            name_lower: sanitizedName.toLowerCase(), // For case-insensitive search
            type: sanitizedType,
            type_lower: sanitizedType.toLowerCase(), // For case-insensitive search
            isOutdoors: Boolean(isOutdoors),
            availability:sanitizedAvailability,
            created_by: req.user.uid,
            created_at: admin.firestore.FieldValue.serverTimestamp()
        };

        let docRef;
        try {
            docRef = await admin.firestore().runTransaction(async (transaction) => {
                // Re-check for duplicates in transaction
                const duplicateCheck = await transaction.get(
                    facilitiesRef
                        .where("name_lower", "==", facilityData.name_lower)
                        .where("type_lower", "==", facilityData.type_lower)
                        .limit(1)
                );

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
                    message: "Facility was just created by another user",
                    errorCode: "CONCURRENT_DUPLICATE"
                });
            }
            throw transactionError;
        }

        // Fetch newly created facility
        const snapShot = await docRef.get();
        const data = snapShot.data();

        res.status(201).json({
            success : true,
            message: "Facility uploaded successfully",
            facility:{
                id: docRef.id,
                name: data.name,
                type: data.type,
                isOutdoors: data.isOutdoors,
                availability: data.availability,
            }
        });
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ message: 'Failed to upload facility' });
    }
});

// Add time slots for a specific facility
router.post('/slots', authenticate, async (req, res) => {  

    // Validate request body exists
    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ 
            message: 'Request body is required',
            errorCode: 'MISSING_BODY'
        });
    }

    // Destructure with default values
    const { 
        facilityId = null, 
        timeslots = null, 
        isAvailable = true, 
        max_capacity = 1 
    } = req.body;

    // Validate required fields
    if (!facilityId || !timeslots) {
        return res.status(400).json({ 
            message: 'facilityId and timeslots are required',
            errorCode: 'MISSING_REQUIRED_FIELDS',
            required: ['facilityId', 'timeslots']
        });
    }

    // Validate timeslots is an array
    if (!Array.isArray(timeslots)) {
        return res.status(400).json({ 
            message: 'timeslots must be an array',
            errorCode: 'INVALID_TIMESLOTS_FORMAT'
        });
    }

    try {
        const batch = admin.firestore().batch();// Helps create multiple entries at the same time

        // Checking if given Facility exists in database
        const facilityRef = admin.firestore().collection("facilities-test").doc(facilityId); 
        const facilitySnap = await facilityRef.get();
        
        if (!facilitySnap.exists) {
            return res.status(404).json({ 
                message: 'Facility not found',
                errorCode: 'FACILITY_NOT_FOUND'
            });
        }

        // Validate timeslot creator
        if (facilitySnap.data().created_by !== req.user.uid) {
            return res.status(403).json({ 
                message: 'Unauthorized: Only the facility creator can add timeslots',
                errorCode: 'UNAUTHORIZED_ACCESS'
            });
        }

        // Process timeslots
        for (const [index, slot] of timeslots.entries()) {
            const [start_time, end_time] = slot || [];

            if (!start_time || !end_time) {
                return res.status(400).json({ 
                    message: `Timeslot at index ${index} is missing start_time or end_time`,
                    errorCode: 'INVALID_TIMESLOT',
                    index
                });
            }

            const startDate = new Date(start_time);
            const endDate = new Date(end_time);

            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                return res.status(400).json({ 
                    message: `Invalid date format at index ${index}`,
                    errorCode: 'INVALID_DATE_FORMAT',
                    index
                });
            }

            if (startDate >= endDate) {
                return res.status(400).json({ 
                    message: `Start time must be before end time at index ${index}`,
                    errorCode: 'INVALID_TIME_RANGE',
                    index
                });
            }

            const slotId = `${facilityId}_${startDate.getTime()}_${endDate.getTime()}`;
            const slotRef = admin.firestore().collection("timeslots-test").doc(slotId);
            
            batch.set(slotRef, {
                facilityId,
                start_time: startDate,
                end_time: endDate,
                isAvailable: Boolean(isAvailable),
                max_capacity: Number(max_capacity),
                created_by: req.user.uid,
                created_at: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        await batch.commit();
        res.status(201).json({ 
            message: "Timeslots created successfully",
            count: timeslots.length
        });

    } catch (error) {
        console.error('Timeslot creation error:', error);
        res.status(500).json({ 
            message: 'Failed to create timeslots',
            errorCode: 'SERVER_ERROR',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Fetch all facilities created by Facility staff
router.get('/staff-facilities', authenticate, async (req, res) => {
    try {
        // 1. Query facilities created by the current user
        const snapshot = await admin.firestore()
            .collection('facilities-test')
            .where('created_by', '==', req.user.uid)
            .get();

        // 2. Format response data
        const facilities = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name,
                type: data.type,
                isOutdoors: data.isOutdoors,
                availability: data.availability
            };
        });

        // 3. Success response
        res.json({
            success: true,
            count: facilities.length,
            facilities
        });

    } catch (err) {
        console.error('Failed to fetch staff facilities:', err);
        
        // 4. Error handling
        const errorResponse = {
            success: false,
            message: "Failed to fetch facilities",
            errorCode: "FETCH_ERROR"
        };

        // Add debug info in development
        if (process.env.NODE_ENV === 'development') {
            errorResponse.error = err.message;
            errorResponse.stack = err.stack;
        }

        res.status(500).json(errorResponse);
    }
});

module.exports = router