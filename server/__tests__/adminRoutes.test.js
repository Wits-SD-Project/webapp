// __tests__/adminRoutes.test.js
const request = require('supertest');
const express = require('express');
const adminRoutes = require('../routes/admin');
const { admin } = require('../firebase');

jest.mock('../firebase');
// __tests__/adminRoutes.test.js
jest.mock('../authenticate', () => 
  // Proper middleware function structure
  (req, res, next) => {
    req.user = { 
      uid: 'admin-uid',
      email: 'admin@example.com',
      role: 'admin'
    };
    next();
  }
);

const app = express();
app.use(express.json());
app.use('/api', adminRoutes);
describe('Admin Routes', () => {
  const testEmail = 'test@example.com';
  const testEvent = {
    eventName: 'Test Event',
    facility: 'Test Facility',
    facilityId: 'facility-123',
    description: 'Test Description',
    startTime: new Date(Date.now() + 3600000).toISOString(),
    endTime: new Date(Date.now() + 7200000).toISOString()
  };

  beforeEach(() => {
    admin.__firestoreData.clear();
    
    admin.__firestoreData.set(testEmail, {
      email: testEmail,
      uid: '12345',
      approved: false,
      accepted: false,
    });
    
    admin.__firestoreData.set('admin@example.com', {
      email: 'admin@example.com',
      uid: 'admin-uid',
      role: 'admin'
    });

    admin.__firestoreData.set('issue1', {
      facilityName: 'Facility A',
      status: 'open',
      createdAt: new Date()
    });

    admin.__firestoreData.set('facility-1', {
      name: 'Test Facility 1'
    });
  });
  
  describe('User Management', () => {
    test('Toggle approval', async () => {
      const res = await request(app)
        .post('/api/toggle-approval')
        .send({ email: testEmail });

      expect(res.status).toBe(200);
      expect(res.body.approved).toBe(true);
    });

    test('Get users', async () => {
      const res = await request(app).get('/api/users');
      
      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ email: testEmail }),
          expect.objectContaining({ email: 'admin@example.com' })
        ])
      );
    });
  });

  describe('Event Management', () => {
    test('Create and manage events', async () => {
      // Create event
      const createRes = await request(app)
        .post('/api/events')
        .send(testEvent);
      
      expect(createRes.status).toBe(201);
      expect(createRes.body.event).toMatchObject({
        eventName: testEvent.eventName,
        facility: {
          id: testEvent.facilityId,
          name: testEvent.facility
        }
      });

      // Update event
      const updateRes = await request(app)
        .put(`/api/events/${createRes.body.event.id}`)
        .send({ ...testEvent, description: 'Updated Description' });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.event.description).toBe('Updated Description');

      // Get events
      const getRes = await request(app).get('/api/events');
      expect(getRes.status).toBe(200);
      expect(getRes.body.events).toHaveLength(1);
    });

    test('Prevent duplicate events', async () => {
      await request(app).post('/api/events').send(testEvent);
      const res = await request(app).post('/api/events').send(testEvent);
      expect(res.status).toBe(409);
    });
  });

  describe('Maintenance Management', () => {
    test('Get maintenance summary', async () => {
      const res = await request(app).get('/api/maintenance-summary');
      
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        openCount: 1,
        closedCount: 0,
        groupedByFacility: {
          'Facility A': { open: 1, closed: 0 }
        }
      });
    });
  });

  describe('Facility Management', () => {
    test('Get all facilities', async () => {
      const res = await request(app).get('/api/facilities');
      
      expect(res.status).toBe(200);
      expect(res.body.facilities).toEqual([
        expect.objectContaining({
          id: 'facility-1',
          name: 'Test Facility 1'
        })
      ]);
    });
  });

  describe('Authorization', () => {
    test('Prevent non-admin access', async () => {
      // Override auth mock for this test
      jest.mock('../authenticate', () => ({
        checkIfAuthenticated: (req, res, next) => {
          req.user = { role: 'user' };
          next();
        }
      }));

      const res = await request(app).get('/api/events');
      expect(res.status).toBe(403);
    });
  });
});