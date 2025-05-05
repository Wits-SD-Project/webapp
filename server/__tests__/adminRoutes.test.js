// adminRoutes.test.js
const request = require('supertest');
const { admin } = require('../firebase');

jest.mock('../firebase');

// Helper to dynamically mock authentication and get a fresh app instance
const getTestApp = (mockUser) => {
  jest.resetModules(); // Clear module cache

  jest.doMock('../authenticate', () => (req, res, next) => {
    req.user = mockUser;
    next();
  });

  const express = require('express');
  const app = express();
  app.use(express.json());

  const adminRoutes = require('../routes/admin');
  app.use('/api', adminRoutes);

  return app;
};

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
      const app = getTestApp({ uid: 'admin-uid', email: 'admin@example.com', role: 'admin' });

      const res = await request(app)
        .post('/api/admin/toggle-approval')
        .send({ email: testEmail });

      expect(res.status).toBe(200);
      expect(res.body.approved).toBe(true);
    });

    test('Get users', async () => {
      const app = getTestApp({ uid: 'admin-uid', email: 'admin@example.com', role: 'admin' });

      const res = await request(app).get('/api/admin/users');

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
      const app = getTestApp({ uid: 'admin-uid', email: 'admin@example.com', role: 'admin' });

      // Create event
      const createRes = await request(app)
        .post('/api/adminevents')
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
        .put(`/api/admin/events/${createRes.body.event.id}`)
        .send({ ...testEvent, description: 'Updated Description' });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.event.description).toBe('Updated Description');

      // Get events
      const getRes = await request(app).get('/api/admin/events');
      expect(getRes.status).toBe(200);
      expect(getRes.body.events).toHaveLength(1);
    });

    test('Prevent duplicate events', async () => {
      const app = getTestApp({ uid: 'admin-uid', email: 'admin@example.com', role: 'admin' });

      await request(app).post('/api/admin/events').send(testEvent);
      const res = await request(app).post('/api/admin/events').send(testEvent);

      expect(res.status).toBe(409);
    });
  });

  describe('Maintenance Management', () => {
    test('Get maintenance summary', async () => {
      const app = getTestApp({ uid: 'admin-uid', email: 'admin@example.com', role: 'admin' });

      const res = await request(app).get('/api/admin/maintenance-summary');

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
      const app = getTestApp({ uid: 'admin-uid', email: 'admin@example.com', role: 'admin' });

      const res = await request(app).get('/api/admin/facilities');

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
      const app = getTestApp({ uid: 'user-123', role: 'user', email: 'user@example.com' });

      const res = await request(app).get('/api/admin/events');
      expect(res.status).toBe(403);
    });
  });
});