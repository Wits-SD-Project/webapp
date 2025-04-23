jest.mock('../firebase');

const request = require('supertest');
const express = require('express');
const facilitiesRouter = require('../routes/facilities'); // adjust path as needed
const { admin } = require('../firebase');

// Helper to clear mock data between tests
function clearFirestoreData() {
  admin.__firestoreData.clear();
}

// Set up test app
const app = express();
app.use(express.json());
app.use('/facilities', facilitiesRouter);

// Mock authentication middleware
jest.mock('../authenticate', () => (req, res, next) => {
  req.user = { uid: 'test-user-123' };
  next();
});

describe('Facilities API Endpoints', () => {
  const facilityId = 'test-facility-id';

  beforeEach(() => {
    admin.__firestoreData.clear();
    admin.__firestoreData.set(facilityId, {
      name: 'Test Facility',
      type: 'Test Type',
      isOutdoors: true,
      created_by: 'test-user-123',
      timeslots: []
    });
  });

  describe('POST /facilities/upload', () => {
    beforeEach(() => {
      // Double-clear to ensure clean state
      admin.__firestoreData.clear();
      jest.clearAllMocks();
    });
  
    it('should successfully upload a new facility', async () => {
      
      const response = await request(app)
        .post('/facilities/upload')
        .send({
          name: 'Unique Facility',  // Changed to ensure uniqueness
          type: 'Basketball Court',
          isOutdoors: true,
          availability: 'Weekdays'
        });
  
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      
      // Verify creation
      const facilities = Array.from(admin.__firestoreData.values());
      expect(facilities).toHaveLength(1);
      expect(facilities[0].name).toBe('Unique Facility');
    });
  });

 // In your test file
describe('POST /facilities/upload', () => {
  beforeEach(() => {
    // Clear all test data before each test
    admin.__firestoreData.clear();
    jest.clearAllMocks();
  });

  it('should prevent duplicate facilities', async () => {
    // First create a facility
    await request(app)
      .post('/facilities/upload')
      .send({
        name: 'Duplicate Facility',
        type: 'Tennis Court',
        isOutdoors: false,
        availability: 'Weekends'
      });

    // Try to create same facility again
    const response = await request(app)
      .post('/facilities/upload')
      .send({
        name: 'Duplicate Facility',
        type: 'Tennis Court',
        isOutdoors: false,
        availability: 'Weekends'
      });

    expect(response.status).toBe(409);
    expect(response.body.errorCode).toBe('DUPLICATE_FACILITY');
  });
});


  describe('GET /facilities/staff-facilities', () => {
    beforeEach(() => {
        // Clear existing data
        admin.__firestoreData.clear();
        
        // Add only test user's facilities
        admin.__firestoreData.set('fac1', {
            name: 'Facility 1',
            created_by: 'test-user-123'
        });
        admin.__firestoreData.set('fac2', {
            name: 'Facility 2', 
            created_by: 'test-user-123'
        });
        
        // Add one facility from another user
        admin.__firestoreData.set('fac3', {
            name: 'Other Facility',
            created_by: 'other-user-456' 
        });
    });

    it('should return facilities created by current user', async () => {
        const response = await request(app)
            .get('/facilities/staff-facilities');
        
        expect(response.status).toBe(200);
        expect(response.body.count).toBe(2);
        expect(response.body.facilities).toHaveLength(2);
    });

    it('should return empty array if no facilities exist', async () => {
      // Clear all data first
      admin.__firestoreData.clear();
      
      const response = await request(app)
          .get('/facilities/staff-facilities');
      
      expect(response.status).toBe(200);
      expect(response.body.count).toBe(0);
      expect(response.body.facilities).toEqual([]);
  });
});

  describe('PUT /facilities/updateFacility/:id', () => {
    it('should successfully update a facility', async () => {
      const facilityId = 'update-test';
      admin.__firestoreData.set(facilityId, {
        name: 'Old Name',
        type: 'Old Type',
        isOutdoors: false,
        availability: 'Old availability',
        created_by: 'test-user-123'
      });
  
      const updates = {
        name: 'New Name',
        type: 'New Type',
        isOutdoors: true,
        availability: 'New availability'
      };
  
      const response = await request(app)
        .put(`/facilities/updateFacility/${facilityId}`)
        .send(updates);
  
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.facility).toMatchObject({
        name: updates.name,
        type: updates.type,
        isOutdoors: 'Yes',
        availability: updates.availability
      });
  
      const updatedFacility = admin.__firestoreData.get(facilityId);
      expect(updatedFacility.name).toBe(updates.name);
      expect(updatedFacility.updatedAt).toBeDefined();
    });
  
    it('should reject updates to non-existent facility', async () => {
      const response = await request(app)
        .put('/facilities/updateFacility/non-existent')
        .send({ name: 'New Name' });
  
      expect(response.status).toBe(404);
    });
  });

  describe('Timeslots Management', () => {
    const facilityId = 'timeslot-test';
    
    beforeEach(() => {
      admin.__firestoreData.set(facilityId, {
        name: 'Timeslot Facility',
        type: 'Test Type',
        isOutdoors: true,
        created_by: 'test-user-123',
        timeslots: [] // Initialize as empty array
      });
    });
  
    describe('PUT /facilities/:id/timeslots', () => {
      it('should add timeslots to a facility', async () => {
        const timeslots = {
          Monday: ['09:00 - 10:00', '11:00 - 12:00'],
          Tuesday: ['14:00 - 15:00']
        };
  
        const response = await request(app)
          .put(`/facilities/${facilityId}/timeslots`)
          .send({ timeslots });
  
        expect(response.status).toBe(200);
        
        const facility = admin.__firestoreData.get(facilityId);
        expect(facility.timeslots).toBeInstanceOf(Array);
        expect(facility.timeslots).toHaveLength(3);
        expect(facility.timeslots).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ day: 'Monday', start: '09:00', end: '10:00' }),
            expect.objectContaining({ day: 'Monday', start: '11:00', end: '12:00' }),
            expect.objectContaining({ day: 'Tuesday', start: '14:00', end: '15:00' })
          ])
        );
      });
  
      it('should reject invalid timeslot formats', async () => {
        const response = await request(app)
          .put(`/facilities/${facilityId}/timeslots`)
          .send({ timeslots: { Monday: ['invalid-format'] } });
  
        expect(response.status).toBe(400);
      });
    });
  
    describe('DELETE /facilities/:id/timeslots', () => {
      it('should delete a specific timeslot', async () => {
        // First add some timeslots
        admin.__firestoreData.set(facilityId, {
          ...admin.__firestoreData.get(facilityId),
          timeslots: [
            { day: 'Monday', start: '09:00', end: '10:00', isBooked: false },
            { day: 'Monday', start: '11:00', end: '12:00', isBooked: false }
          ]
        });
  
        const response = await request(app)
        .delete(`/facilities/${facilityId}/timeslots`)
        .send({ day: 'Monday', start: '09:00', end: '10:00' });
  
        expect(response.status).toBe(200);
        expect(response.body.remainingCount).toBe(1);
        
        const facility = admin.__firestoreData.get(facilityId);
        expect(facility.timeslots).toEqual([
          { day: 'Monday', start: '11:00', end: '12:00', isBooked: false }
        ]);
      });
  
      it('should return 404 if timeslot not found', async () => {
        const response = await request(app)
          .delete(`/facilities/${facilityId}/timeslots`)
          .send({ day: 'Tuesday', start: '09:00', end: '10:00' });
  
        expect(response.status).toBe(404);
      });
    });
  
    describe('POST /facilities/timeslots', () => {
      it('should retrieve timeslots for a facility', async () => {
        const testTimeslots = [
          { day: 'Wednesday', start: '13:00', end: '14:00', isBooked: false }
        ];
        
        admin.__firestoreData.set(facilityId, {
          ...admin.__firestoreData.get(facilityId),
          timeslots: testTimeslots
        });
  
        const response = await request(app)
          .post('/facilities/timeslots')
          .send({ facilityId });
  
        expect(response.status).toBe(200);
        expect(response.body.timeslots).toBeInstanceOf(Array);
        expect(response.body.timeslots).toEqual(testTimeslots);
      });
  
      it('should return empty array if no timeslots exist', async () => {
        const response = await request(app)
          .post('/facilities/timeslots')
          .send({ facilityId });
  
        expect(response.status).toBe(200);
        expect(response.body.timeslots).toBeInstanceOf(Array);
        expect(response.body.timeslots).toHaveLength(0);
      });
    });
  });
});