// tests/authenticate.test.js
jest.mock('../firebase'); // ✅ Ensures your mock is used

const authenticate = require('../authenticate');
const { admin } = require('../firebase');
const httpMocks = require('node-mocks-http');

describe('authenticate middleware', () => {
  it('should allow valid token', async () => {
    const req = httpMocks.createRequest({
      headers: { authorization: 'Bearer valid-token' },
    });
    const res = httpMocks.createResponse();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(admin.auth().verifyIdToken).toHaveBeenCalledWith('valid-token');
    expect(req.user).toMatchObject({
      uid: '12345',
      email: 'test@example.com',
      emailVerified: undefined,
      role: 'user',
    });
    expect(next).toHaveBeenCalled();
  });
});
