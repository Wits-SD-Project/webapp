jest.mock('../firebase');

const express = require('express');
const request = require('supertest');
const cookieParser = require('cookie-parser');

const { admin } = require('../firebase');
const authenticate = require('../authenticate');
const facilityRoutes = require('../routes/facilities'); // adjust if needed

let app;

beforeAll(() => {
  app = express();
  app.use(express.json());
  app.use(cookieParser());

  app.use('/api/facilities', facilityRoutes);

  // Add the test-only protected route
  const testRouter = express.Router();
  testRouter.get('/protected-test', authenticate, (req, res) => {
    res.json({ user: req.user });
  });
  app.use('/api/facilities', testRouter);
});


describe("Express App Integration", () => {
  describe("Base routes", () => {
    it("GET / should return Hello World", async () => {
      const res = await request(app).get("/");
      expect(res.statusCode).toBe(200);
      expect(res.text).toBe("Hello World!");
    });

    it("GET /health should return status ok", async () => {
      const res = await request(app).get("/health");
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ status: "ok" });
    });
  });

  describe("Mounted routers", () => {
    it("should respond 404 on unknown /api/auth route if not implemented", async () => {
      const res = await request(app).get("/api/auth/nonexistent");
      expect(res.statusCode).toBe(404);
    });

    it("should respond 404 on unknown /api/admin route if not implemented", async () => {
      const res = await request(app).get("/api/admin/nonexistent");
      expect(res.statusCode).toBe(404);
    });

    it("should respond 404 on unknown /api/facilities route if not implemented", async () => {
      const res = await request(app).get("/api/facilities/nonexistent");
      expect(res.statusCode).toBe(404);
    });
  });

  describe("Invalid routes", () => {
    it("should return 404 on an unknown route", async () => {
      const res = await request(app).get("/this-does-not-exist");
      expect(res.statusCode).toBe(404);
    });
  });
});

describe("Authentication integration tests", () => {
  const validToken = "valid-token";
  const invalidToken = "invalid-token";

  beforeEach(() => {
    admin.__firestoreData.clear(); // clean state
  });

  describe("authenticate-protected routes", () => {
    const testRoutePath = "/api/facilities/protected-test";

    // Mock a protected test route
    beforeAll(() => {
      const express = require("express");
      const authenticate = require("../authenticate");
      const router = express.Router();

      router.get("/protected-test", authenticate, (req, res) => {
        res.json({ user: req.user });
      });

      app.use("/api/facilities", router);
    });

    it("should return 401 if no auth token provided", async () => {
      const res = await request(app).get("/api/facilities/protected-test");
      expect(res.statusCode).toBe(401);
      expect(res.body).toMatchObject({
        message: "Authentication required",
        errorCode: "MISSING_AUTH_TOKEN",
      });
    });

    it("should clear cookie on token error", async () => {
      const res = await request(app)
        .get("/api/facilities/protected-test")
        .set("Authorization", "Bearer invalid-token");

      const setCookieHeader = res.headers["set-cookie"] || [];
      const cleared = setCookieHeader.find(
        (h) =>
          h.includes("authToken=") && h.includes("Expires=Thu, 01 Jan 1970")
      );

      expect(cleared).toBeDefined();
    });

    it("should return 401 for invalid token", async () => {
      const res = await request(app)
        .get("/api/facilities/protected-test")
        .set("Authorization", `Bearer ${invalidToken}`);
      expect(res.statusCode).toBe(401);
      expect(res.body).toMatchObject({
        message: "Invalid or expired token",
        errorCode: "INVALID_AUTH_TOKEN",
      });
    });

    it("should authenticate using Authorization header", async () => {
      admin.__firestoreData.set("test@example.com", { role: "admin" });

      const res = await request(app)
        .get("/api/facilities/protected-test")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user).toMatchObject({
        uid: "12345",
        email: "test@example.com",
        role: "admin",
      });
    });

    it('should fall back to "user" role if role missing in Firestore', async () => {
      // no role saved in mock
      admin.__firestoreData.set("test@example.com", {});

      const res = await request(app)
        .get("/api/facilities/protected-test")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user).toMatchObject({
        role: "user",
      });
    });

    it("should support cookie-based auth token", async () => {
      admin.__firestoreData.set("test@example.com", { role: "editor" });

      const res = await request(app)
        .get("/api/facilities/protected-test")
        .set("Cookie", [`authToken=${validToken}`]);

      expect(res.statusCode).toBe(200);
      expect(res.body.user).toMatchObject({
        role: "editor",
      });
    });
  });
});

describe("CORS and routing edge cases", () => {
  it("OPTIONS / should return 204 with CORS headers", async () => {
    const res = await request(app).options("/");
    expect(res.statusCode).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBeDefined();
  });

  it("should reject disallowed origin", async () => {
    const res = await request(app)
      .get("/")
      .set("Origin", "http://unauthorized-origin.com");

    // If error in CORS, Express won't respond directly – check for network error or no header
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
