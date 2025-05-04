const request = require('supertest');
const express = require('express');
const adminRoutes = require('../routes/admin');

jest.mock('../firebase');
jest.mock('../authenticate', () => (req, res, next) => {
  req.user = { 
    email: 'admin@example.com',
    uid: 'admin123',
    role: 'admin'
  };
  next();
});

const { admin } = require('../firebase');

// Mount the routes with correct prefix
const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes); // Changed to match actual mounting

describe('Admin Routes', () => {
  const testEmail = 'test@example.com';

  beforeEach(() => {
    admin.__firestoreData.clear();
    admin.__firestoreData.set(testEmail, {
      email: testEmail,
      uid: '12345',
      approved: false,
      accepted: false,
    });
  });

  test('Toggle approval', async () => {
    const res = await request(app)
      .post('/api/admin/toggle-approval') // Updated path
      .send({ email: testEmail });

    expect(res.status).toBe(200);
    expect(res.body.approved).toBe(true);
  });

  test('Get users', async () => {
    const res = await request(app)
      .get('/api/admin/users'); // Updated path

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email: testEmail }),
      ])
    );
  });
});

describe('Admin Event Routes', () => {
  const adminEmail = 'admin@example.com';
  const adminUid = 'admin123';
  const now = new Date();
  const later = new Date(now.getTime() + 60 * 60 * 1000);

  beforeEach(() => {
    admin.__firestoreData.clear();
    
    // Setup admin user
    admin.__firestoreData.set(`users/${adminEmail}`, {
      email: adminEmail,
      uid: adminUid,
      role: 'admin',
    });

    // Setup facilities
    admin.__firestoreData.setCollection('facilities-test', [
      { id: 'f1', name: 'Main Gym' },
    ]);
  });

  test('POST /api/admin/events - create a new event', async () => {
    const res = await request(app)
      .post('/api/admin/events')
      .send({
        eventName: 'Test Event',
        facility: 'Main Gym',
        facilityId: 'f1',
        description: 'A test event',
        startTime: now.toISOString(),
        endTime: later.toISOString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.event.eventName).toBe('Test Event');
    
    // Verify event was created
    const events = Array.from(admin.__firestoreData.entries())
      .filter(([key]) => key.startsWith('admin-events/'))
      .map(([, value]) => value);
    
    expect(events.length).toBe(1);
    expect(events[0].eventName).toBe('Test Event');
  });

  test('GET /api/admin/events - fetch all admin events', async () => {
    // Create test event first
    admin.__firestoreData.setDoc('admin-events', 'event1', {
      eventName: 'Existing Event',
      facility: 'Main Gym',
      facilityId: 'f1',
      description: 'Pre-existing',
      startTime: now.toISOString(),
      endTime: later.toISOString(),
      createdBy: adminUid
    });

    const res = await request(app)
      .get('/api/admin/events');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.events.length).toBe(1);
    expect(res.body.events[0].eventName).toBe('Existing Event');
  });
});