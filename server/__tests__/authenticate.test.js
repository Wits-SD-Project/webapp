jest.mock('../firebase');

const authenticate = require('../authenticate');
const { admin } = require('../firebase');
const httpMocks = require('node-mocks-http');

describe('authenticate middleware', () => {
  const mockUser = {
    uid: '12345',
    email: 'test@example.com',
    name: 'Test User',
  };

  beforeEach(() => {
    admin.__firestoreData.clear();
    jest.clearAllMocks();
  });

  it('should authenticate with a valid Bearer token and fetch role from Firestore', async () => {
    admin.__firestoreData.set('test@example.com', { role: 'admin' });

    const req = httpMocks.createRequest({
      headers: { authorization: 'Bearer valid-token' },
    });
    const res = httpMocks.createResponse();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(req.user).toEqual({
      uid: '12345',
      email: 'test@example.com',
      emailVerified: undefined,
      role: 'admin',
    });
    expect(next).toHaveBeenCalled();
  });

  it('should assign default role "user" if Firestore doc does not exist', async () => {
    // No data set in __firestoreData__

    const req = httpMocks.createRequest({
      headers: { authorization: 'Bearer valid-token' },
    });
    const res = httpMocks.createResponse();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(req.user.role).toBe('user');
    expect(next).toHaveBeenCalled();
  });

  it('should assign default role "user" if Firestore doc has no role', async () => {
    admin.__firestoreData.set('test@example.com', {});

    const req = httpMocks.createRequest({
      headers: { authorization: 'Bearer valid-token' },
    });
    const res = httpMocks.createResponse();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(req.user.role).toBe('user');
    expect(next).toHaveBeenCalled();
  });

  it('should authenticate using token from cookies', async () => {
    admin.__firestoreData.set('test@example.com', { role: 'manager' });

    const req = httpMocks.createRequest({
      cookies: { authToken: 'valid-token' },
    });
    const res = httpMocks.createResponse();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(req.user.role).toBe('manager');
    expect(next).toHaveBeenCalled();
  });

  it('should authenticate with token without Bearer prefix', async () => {
    admin.__firestoreData.set('test@example.com', { role: 'editor' });

    const req = httpMocks.createRequest({
      headers: { authorization: 'valid-token' },
    });
    const res = httpMocks.createResponse();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(req.user.role).toBe('editor');
    expect(next).toHaveBeenCalled();
  });

  it('should return 401 if no token is provided', async () => {
    const req = httpMocks.createRequest(); // no headers or cookies
    const res = httpMocks.createResponse();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(res.statusCode).toBe(401);
    const json = res._getJSONData();
    expect(json.message).toMatch(/Authentication required/);
    expect(json.errorCode).toBe('MISSING_AUTH_TOKEN');
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 for an invalid token', async () => {
    const req = httpMocks.createRequest({
      headers: { authorization: 'Bearer invalid-token' },
    });
    const res = httpMocks.createResponse();
    res.clearCookie = jest.fn();
    const next = jest.fn();

    await authenticate(req, res, next);

    expect(res.clearCookie).toHaveBeenCalledWith('authToken', expect.any(Object));
    expect(res.statusCode).toBe(401);
    const json = res._getJSONData();
    expect(json.message).toMatch(/Invalid or expired token/);
    expect(json.errorCode).toBe('INVALID_AUTH_TOKEN');
    expect(next).not.toHaveBeenCalled();
  });
});
