// __tests__/adminRoutes.test.js
const request = require('supertest');
const express = require('express');
const adminRoutes = require('../routes/admin');

jest.mock('../firebase');
const { admin } = require('../firebase');

// Mount the routes
const app = express();
app.use(express.json());
app.use('/api', adminRoutes);

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
      .post('/api/toggle-approval')
      .send({ email: testEmail });

    expect(res.status).toBe(200);
    expect(res.body.approved).toBe(true);
  });

  test('Toggle accepted', async () => {
    const res = await request(app)
      .post('/api/toggle-accepted')
      .send({ email: testEmail });

    expect(res.status).toBe(200);
    expect(res.body.accepted).toBe(true);
  });

  test('Get users', async () => {
    const res = await request(app).get('/api/users');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email: testEmail }),
      ])
    );
  });
});