// __tests__/app.integration.test.js
jest.mock("../firebase"); // Ensure Firebase is mocked

const request = require("supertest");
const app = require("../index"); // Adjust if your entry is named differently
const allowedOrigins = app.allowedOrigins; // Import allowedOrigins from app

describe("Express App Integration", () => {
  describe("Base routes", () => {
    it("GET / should return Hello World with text/html Content-Type", async () => {
      const res = await request(app).get("/");
      expect(res.statusCode).toBe(200);
      expect(res.text).toBe("Hello World!");
      expect(res.headers["content-type"]).toMatch(/text\/html/);
    });

    it("GET /health should return status ok with JSON Content-Type", async () => {
      const res = await request(app).get("/health");
      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ status: "ok" });
      expect(res.headers["content-type"]).toMatch(/application\/json/);
    });

    it("POST / should return 404", async () => {
      const res = await request(app).post("/");
      expect(res.statusCode).toBe(404);
    });

    it("POST /health should return 404", async () => {
      const res = await request(app).post("/health");
      expect(res.statusCode).toBe(404);
    });
  });

  describe("CORS configuration", () => {
    const testOrigin =
      allowedOrigins && allowedOrigins.length > 0
        ? allowedOrigins[0]
        : "http://default.allowed";

    it("should allow requests from allowed origins", async () => {
      const res = await request(app).get("/").set("Origin", testOrigin);

      expect(res.headers["access-control-allow-origin"]).toBe(testOrigin);
      expect(res.headers["access-control-allow-credentials"]).toBe("true");
      expect(res.statusCode).toBe(200);
    });

    it("should block requests from disallowed origins", async () => {
      const res = await request(app)
        .get("/")
        .set("Origin", "http://disallowed.com");

      expect(res.statusCode).toBe(500);
      expect(res.text).toContain("CORS");
    });

    it("should handle OPTIONS preflight requests", async () => {
      const res = await request(app)
        .options("/")
        .set("Origin", testOrigin)
        .set("Access-Control-Request-Method", "GET")
        .set("Access-Control-Request-Headers", "Authorization");

      expect(res.statusCode).toBe(204);
      expect(res.headers["access-control-allow-methods"]).toContain("GET");
      expect(res.headers["access-control-allow-headers"]).toContain(
        "Authorization"
      );
    });
  });

  describe("Error handling", () => {
    // Temporary error route for testing purposes
    beforeAll(() => {
      app.get("/test-error", () => {
        throw new Error("Test error");
      });
    });

    it("should return 500 for unhandled errors", async () => {
      const res = await request(app).get("/test-error");
      expect(res.statusCode).toBe(500);
      expect(res.text).toContain("Test error");
    });
  });

  describe("Mounted routers", () => {
    it("should respond 404 on unknown /api/auth route", async () => {
      const res = await request(app).get("/api/auth/nonexistent");
      expect(res.statusCode).toBe(404);
    });

    it("should respond 404 on unknown /api/admin route", async () => {
      const res = await request(app).get("/api/admin/nonexistent");
      expect(res.statusCode).toBe(404);
    });

    it("should respond 404 on unknown /api/facilities route", async () => {
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
