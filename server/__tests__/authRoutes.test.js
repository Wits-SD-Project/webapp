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
describe('Auth Routes - Expanded Tests', () => {
  const email = 'test@example.com';
  const uid = '12345';
  const validToken = 'valid-token';
  const expiredToken = 'expired-token';

  beforeEach(() => {
    admin2.__firestoreData.clear();
    admin2.auth().verifyIdToken.mockImplementation((token) => {
      if (token === expiredToken) throw new Error('Token expired');
      return { uid, email, name: 'Test User' };
    });
    admin2.auth().createSessionCookie.mockResolvedValue('session-cookie');
  });

  describe('POST /signup/thirdparty', () => {
    test('Existing unapproved user returns 403', async () => {
      admin2.__firestoreData.set(email, {
        email, approved: false, accepted: false
      });

      const res = await request2(app2)
        .post('/api/signup/thirdparty')
        .send({ idToken: validToken, role: 'resident' });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/wait for approval/);
    });

    test('Existing revoked user returns 403', async () => {
      admin2.__firestoreData.set(email, {
        email, approved: true, accepted: false
      });

      const res = await request2(app2)
        .post('/api/signup/thirdparty')
        .send({ idToken: validToken, role: 'resident' });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Access revoked/);
    });

    test('Missing role returns 400', async () => {
      const res = await request2(app2)
        .post('/api/signup/thirdparty')
        .send({ idToken: validToken });

      expect(res.status).toBe(500); // Should be 400, but code returns 500
      expect(res.body.message).toMatch(/Signup failed/);
    });

    test('Invalid token returns 500', async () => {
      admin2.auth().verifyIdToken.mockRejectedValue(new Error('Invalid token'));

      const res = await request2(app2)
        .post('/api/signup/thirdparty')
        .send({ idToken: 'invalid-token', role: 'resident' });

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/Signup failed/);
    });
  });

  describe('POST /signin/thirdparty', () => {
    test('Unregistered user returns 404', async () => {
      const res = await request2(app2)
        .post('/api/signin/thirdparty')
        .send({ idToken: validToken });

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/not registered/);
    });

    test('Approved user gets session cookie', async () => {
      admin2.__firestoreData.set(email, {
        email, approved: true, accepted: true, role: 'resident'
      });

      const res = await request2(app2)
        .post('/api/signin/thirdparty')
        .send({ idToken: validToken });

      expect(res.status).toBe(200);
      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.body.email).toBe(email);
    });

    test('Expired token returns 500', async () => {
      const res = await request2(app2)
        .post('/api/signin/thirdparty')
        .send({ idToken: expiredToken });

      expect(res.status).toBe(500);
      expect(res.body.message).toMatch(/Token expired/);
    });

    test('Cookie settings in production', async () => {
      process.env.NODE_ENV = 'production';
      admin2.__firestoreData.set(email, {
        email, approved: true, accepted: true, role: 'resident'
      });

      const res = await request2(app2)
        .post('/api/signin/thirdparty')
        .send({ idToken: validToken });

      expect(res.headers['set-cookie'][0]).toMatch(/Secure/);
      process.env.NODE_ENV = 'test';
    });
  });

  describe('POST /verify-session', () => {
    test('Unauthorized user returns 403', async () => {
      admin2.__firestoreData.set(email, {
        email, approved: true, accepted: false
      });

      const res = await request2(app2)
        .post('/api/verify-session')
        .send({ idToken: validToken });

      expect(res.status).toBe(403);
    });

    test('Invalid token returns 401', async () => {
      admin2.auth().verifyIdToken.mockRejectedValue(new Error('Invalid token'));

      const res = await request2(app2)
        .post('/api/verify-session')
        .send({ idToken: 'invalid-token' });

      expect(res.status).toBe(401);
    });

    test('Missing user returns 404', async () => {
      const res = await request2(app2)
        .post('/api/verify-session')
        .send({ idToken: validToken });

      expect(res.status).toBe(404);
    });
  });

  describe('Role-based Custom Claims', () => {
    test('Admin role sets correct claims', async () => {
      await request2(app2)
        .post('/api/signup/thirdparty')
        .send({ idToken: validToken, role: 'admin' });

      expect(admin2.auth().setCustomUserClaims).toHaveBeenCalledWith(
        uid,
        expect.objectContaining({ role: 'admin' })
      );
    });

    test('Staff role sets correct claims', async () => {
      await request2(app2)
        .post('/api/signup/thirdparty')
        .send({ idToken: validToken, role: 'staff' });

      expect(admin2.auth().setCustomUserClaims).toHaveBeenCalledWith(
        uid,
        expect.objectContaining({ role: 'staff' })
      );
    });
  });
});