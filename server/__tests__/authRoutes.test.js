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
    admin.__firestoreData.clear();
    admin.auth().verifyIdToken.mockClear();
    admin.auth().setCustomUserClaims.mockClear();
  });

  test('Signup - New user', async () => {
    // Mock the auth response
    admin.auth().verifyIdToken.mockResolvedValueOnce({
      uid,
      email,
      name: 'Test User'
    });

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ idToken: 'valid-token', role: 'resident' });

    expect(res.status).toBe(200);
    expect(res.body.email).toBe(email);
    expect(admin.auth().setCustomUserClaims).toHaveBeenCalledWith(uid, {
      role: 'resident',
      approved: false
    });
    
    // Verify user was created in Firestore
    const userDoc = admin.__firestoreData.get(`users/${email}`);
    expect(userDoc).toBeDefined();
    expect(userDoc.uid).toBe(uid);
  });
});