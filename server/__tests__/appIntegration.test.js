// __tests__/app.integration.test.js
jest.mock('../firebase'); // Ensure Firebase is mocked

const request = require('supertest');
const app = require('../index'); // Adjust if your entry is named differently

describe('Express App Integration', () => {
  describe('Base routes', () => {
    it('GET / should return Hello World', async () => {
      const res = await request(app).get('/');
      expect(res.statusCode).toBe(200);
      expect(res.text).toBe('Hello World!');
    });

    it('GET /health should return status ok', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ status: 'ok' });
    });
  });

  describe('Mounted routers', () => {
    it('should respond 404 on unknown /api/auth route if not implemented', async () => {
      const res = await request(app).get('/api/auth/nonexistent');
      expect(res.statusCode).toBe(404);
    });

    it('should respond 404 on unknown /api/admin route if not implemented', async () => {
      const res = await request(app).get('/api/admin/nonexistent');
      expect(res.statusCode).toBe(404);
    });

    it('should respond 404 on unknown /api/facilities route if not implemented', async () => {
      const res = await request(app).get('/api/facilities/nonexistent');
      expect(res.statusCode).toBe(404);
    });
  });

  describe('Invalid routes', () => {
    it('should return 404 on an unknown route', async () => {
      const res = await request(app).get('/this-does-not-exist');
      expect(res.statusCode).toBe(404);
    });
  });
});
