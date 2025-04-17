//Api endpoints for sports facility related logic
const express = require("express");
const router = express.Router();
const { storage } = require('../config/cloudinary');
const multer = require('multer');
const authenticate = require('../authenticate')
const { admin } = require("../firebase");

const upload = multer({storage}); //stores image in RAM temporarily

// Upload facility on database
router.post('/upload', upload.single('image'), authenticate, async (req, res) => {
    const { name, description, type } = req.body;
    const img = req.file;

    try {

        if (!img) {
            return res.status(400).json({ message: 'No image uploaded' });
          }

        //Add Facility entry onto Database
        await admin.firestore()
            .collection("facilities-test")
            .add({
                name,
                description,
                type,
                imageUrl: img.path,
                created_by: req.user.uid,
                created_at: admin.firestore.FieldValue.serverTimestamp()
            });

        res.status(201).json({ message: "Facility uploaded successfully" });
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

// Get facilities of similar type 
router.get('/types',async (req,res) => {
    try {
        
    } catch (error) {
        
    }
});

module.exports = router