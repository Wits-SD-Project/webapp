// __tests__/authRoutes.test.js
const request2 = require('supertest');
const express2 = require('express');
const authRoutes = require('../routes/auth');

jest.mock('../firebase');
const { admin: admin2 } = require('../firebase');

// Mount the routes
const app2 = express2();
app2.use(express2.json());
app2.use('/api', authRoutes);

describe('Auth Routes', () => {
  const email = 'test@example.com';
  const uid = '12345';

  beforeEach(() => {
    admin2.__firestoreData.clear();
    // reset auth mocks
    admin2.auth().verifyIdToken.mockClear();
    admin2.auth().setCustomUserClaims.mockClear();
    admin2.auth().createSessionCookie.mockClear();
  });

  test('Signup - New user', async () => {
    const res = await request2(app2)
      .post('/api/signup/thirdparty')
      .send({ idToken: 'valid-token', role: 'resident' });

    expect(res.status).toBe(200);
    expect(res.body.email).toBe(email);
    expect(admin2.auth().setCustomUserClaims).toHaveBeenCalledWith(uid, {
      role: 'resident', approved: false
    });
  });

  test('Signin - Unapproved', async () => {
    admin2.__firestoreData.set(email, {
      email, uid, approved: false, accepted: true, role: 'resident', name: 'Test'
    });

    const res = await request2(app2)
      .post('/api/signin/thirdparty')
      .send({ idToken: 'valid-token' });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/not yet approved/);
  });

  test('Verify session - Approved & accepted', async () => {
    admin2.__firestoreData.set(email, {
      email, uid, approved: true, accepted: true, role: 'resident', name: 'Test'
    });

    const res = await request2(app2)
      .post('/api/verify-session')
      .send({ idToken: 'valid-token' });

    expect(res.status).toBe(200);
    expect(res.body.user).toEqual(expect.objectContaining({ email, role: 'resident', name: 'Test' }));
  });
});
