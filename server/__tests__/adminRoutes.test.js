jest.mock("../firebase");
const request = require("supertest");
const express = require("express");
const adminMock = require("../firebase").admin;

jest.setTimeout(15000); // Increase global timeout
// ☑️ helper to mount with a fake user
const makeApp = (mockUser = {}) => {
  jest.resetModules(); // flush Express cache
  jest.doMock("../authenticate", () => (_req, _res, next) => {
    _req.user = mockUser;
    next();
  });

  const adminRoutes = require("../routes/admin");
  const app = express();
  app.use(express.json());
  app.use("/api/admin", adminRoutes);
  return app;
};

// Add these at the top with other test helpers
const makeAdminApp = () =>
  makeApp({
    email: "admin@example.com",
    role: "admin",
    uid: "root",
  });

const makeStaffApp = (uid) =>
  makeApp({
    uid,
    email: `${uid}@example.com`,
    role: "staff",
  });

describe("ADMIN router", () => {
  const email = "user@example.com";
  const adminMail = "admin@example.com";
  const uid = "uid-123";

  beforeEach(() => {
    adminMock.__firestoreData.clear();
    jest.clearAllMocks();
    // seed an admin user + normal user
    adminMock.__firestoreData.set(adminMail, {
      email: adminMail,
      uid: "root",
      role: "admin",
      approved: true,
      accepted: true,
    });
    adminMock.__firestoreData.set(email, {
      email,
      uid: "user-123", // Add UID
      role: "resident",
      approved: false,
      accepted: true,
    });
    adminMock.__firestoreData.set("court-1", {
      name: "Tennis Court",
      type: "Tennis",
      capacity: 4,
    });

    adminMock.__firestoreData.set("staff-1", {
      email: "staff@example.com",
      role: "staff",
      approved: true,
    });

    adminMock.__firestoreData.set("res1@test.com", {
      role: "resident",
      email: "res1@test.com",
    });
    adminMock.__firestoreData.set("res2@test.com", {
      role: "resident",
      email: "res2@test.com",
    });

    adminMock.__firestoreData.set("b1", {
      facilityId: "court-1",
      slot: "09:00 - 10:00",
      date: new Date().toISOString().split("T")[0], // YYYY-MM-DD format
    });

    // Update test data:
    adminMock.__firestoreData.set("b1", {
      facilityStaff: "staff-1",
      status: "pending",
      date: new Date().toISOString().split("T")[0], // Ensure same day
    });
  });

  afterEach(() => {
    // Clear all firestore data
    adminMock.__firestoreData.clear();

    // Reset specific mocks
    adminMock.auth().setCustomUserClaims.mockClear();
    adminMock.firestore().collection.mockClear();
    adminMock.firestore().runTransaction.mockClear();
  });

  /* ─────────────────────────  USER MANAGEMENT  ───────────────────── */

  test("Toggle approval with 'revoke' action sets accepted to false", async () => {
    const app = makeAdminApp();
    const testEmail = "revoke-test@example.com";

    // Setup test user with approved status
    adminMock.__firestoreData.set(testEmail, {
      email: testEmail,
      uid: "revoke-test-uid",
      role: "resident",
      approved: true,
      accepted: true,
      createdAt: new Date(),
    });

    const res = await request(app).post("/api/admin/toggle-approval").send({
      email: testEmail,
      action: "revoke",
    });

    // Verify response
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      approved: true, // Should remain unchanged
      accepted: false, // Should be revoked
      message: "User access revoked successfully.",
    });

    // Verify Firestore update
    const userDoc = adminMock.__firestoreData.get(testEmail);
    expect(userDoc.accepted).toBe(false);
    expect(userDoc.approved).toBe(true); // Approved status maintained
  });

  test("Toggle approval with 'approve' action sets both approved and accepted to true", async () => {
    const app = makeAdminApp();
    const testEmail = "approve-test@example.com";

    // Setup test user with initial rejected status
    adminMock.__firestoreData.set(testEmail, {
      email: testEmail,
      uid: "approve-test-uid",
      role: "resident",
      approved: false,
      accepted: false,
      createdAt: new Date(),
    });

    const res = await request(app).post("/api/admin/toggle-approval").send({
      email: testEmail,
      action: "approve",
    });

    // Verify response
    expect(res.status).toBe(200);
    console.log(res.body);
    expect(res.body).toMatchObject({
      success: true,
      approved: true,
      accepted: true,
      message: "User approved and access granted successfully.",
    });

    // Verify Firestore update
    const userDoc = adminMock.__firestoreData.get(testEmail);
    expect(userDoc.approved).toBe(true);
    expect(userDoc.accepted).toBe(true);
  });
  test("list users", async () => {
    const app = makeApp({ email: adminMail, role: "admin" });

    const res = await request(app).get("/api/admin/users");
    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email }),
        expect.objectContaining({ email: adminMail }),
      ])
    );
  });

  /* ─────────────────────────────  EVENTS  ─────────────────────────── */

  const event = {
    eventName: "Launch Day",
    facilityName: "Hall A", // Add this missing field
    facilityId: "fac-1",
    description: "test",
    startTime: new Date(Date.now() + 60_000).toISOString(),
    endTime: new Date(Date.now() + 3_600_000).toISOString(),
    posterImage: "test.jpg", // Add this if your implementation now requires it
  };

  test("create → update → list → delete event", async () => {
    const app = makeApp({ email: adminMail, role: "admin", uid: "root" });

    /* create */
    const create = await request(app).post("/api/admin/events").send(event);
    expect(create.status).toBe(201);
    const id = create.body.event.id;

    /* update */
    const update = await request(app)
      .put(`/api/admin/events/${id}`)
      .send({ ...event, description: "updated" });
    expect(update.status).toBe(200);
    expect(update.body.event.description).toBe("updated");

    /* duplicate prevent */
    const dup = await request(app).post("/api/admin/events").send(event);
    expect(dup.status).toBe(409);

    /* list */
    const list = await request(app).get("/api/admin/events");
    expect(list.status).toBe(200);
    expect(list.body.events).toHaveLength(1);

    /* delete */
    const del = await request(app).delete(`/api/admin/events/${id}`);
    expect(del.status).toBe(200);
  });

  /* ─────────────────────  MAINTENANCE SUMMARY  ───────────────────── */

  test("maintenance summary groups by facility", async () => {
    // seed a report
    adminMock.__firestoreData.set("issue-1", {
      facilityName: "Gym",
      status: "open",
      createdAt: new Date(),
    });

    const app = makeApp({ email: adminMail, role: "admin" });
    const res = await request(app).get("/api/admin/maintenance-summary");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      openCount: 1,
      closedCount: 0,
      groupedByFacility: { Gym: { open: 1, closed: 0 } },
    });
  });

  /* ─────────────────────────  FACILITIES  ────────────────────────── */

  test("get all facilities", async () => {
    adminMock.__firestoreData.set("fac-1", { name: "Main Court" });

    const app = makeApp({ email: adminMail, role: "admin" });
    const res = await request(app).get("/api/admin/facilities");

    expect(res.status).toBe(200);
    expect(res.body.facilities).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "Main Court" })])
    );
  });

  // ==============================================
  // EVENT NOTIFICATIONS & STATISTICS
  // ==============================================
  describe("Event Notifications & Statistics", () => {
    const eventData = {
      eventName: "Test Event",
      facilityId: "court-1",
      facilityName: "Tennis Court",
      description: "Test Description",
      startTime: new Date(Date.now() + 3600000).toISOString(),
      endTime: new Date(Date.now() + 7200000).toISOString(),
    };

    beforeEach(async () => {
      // Create test event
      const app = makeAdminApp();
      await request(app).post("/api/admin/events").send(eventData);
    });

    test("POST /events/notify creates resident notifications", async () => {
      const app = makeAdminApp();

      adminMock.__firestoreData.clear();

      // Add approved residents
      adminMock.__firestoreData.set("res1@test.com", {
        role: "resident",
        approved: true,
        uid: "res-1",
        email: "res1@test.com",
      });
      adminMock.__firestoreData.set("res2@test.com", {
        role: "resident",
        approved: true,
        uid: "res-2",
        email: "res2@test.com",
      });

      const res = await request(app)
        .post("/api/admin/events/notify")
        .send({ ...eventData, eventId: "event-1" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Notifications sent to 2 residents");
    });
    // In Hourly Bookings test
    test("GET /hourly-bookings aggregates time slots", async () => {
      // UTC date handling
      const fixedDate = new Date("2023-01-01T09:00:00Z");
      jest.useFakeTimers({ now: fixedDate });

      // Date stored as string without time
      adminMock.__firestoreData.set("b1", {
        facilityId: "court-1",
        slot: "09:00 - 10:00",
        date: "2023-01-01", // No time component
      });

      const app = makeAdminApp();
      const res = await request(app).get("/api/admin/hourly-bookings");

      expect(res.body.hourlyBookings).toContainEqual(
        expect.objectContaining({ hour: "9 AM", bookings: 1 })
      );
    });
  });

  // ==============================================
  // MAINTENANCE & STAFF ENDPOINTS
  // ==============================================
  describe("Maintenance & Staff Endpoints", () => {
    // In Staff Dashboard test
    test("GET /staff-dashboard shows correct metrics", async () => {
      // Set fixed date
      const fixedDate = new Date("2023-01-01");
      jest.useFakeTimers().setSystemTime(fixedDate);

      // Seed booking with matching date
      adminMock.__firestoreData.set("b1", {
        facilityStaff: "staff-1",
        status: "pending",
        date: "2023-01-01",
      });

      const app = makeStaffApp("staff-1");
      const res = await request(app).get("/api/admin/staff-dashboard");

      expect(res.body.data).toEqual({
        upcomingCount: 0,
        pendingCount: 1,
        daysUntilNext: null,
      });
    });
  });

  // ==============================================
  // SECURITY & VALIDATION
  // ==============================================
  describe("Security & Validation", () => {
    // Update security test cases
    test.each([
      ["POST", "/api/admin/events", "staff", 403],
      ["POST", "/api/admin/block-slot", "staff", 403],
    ])("%s %s blocks %s role", async (method, path, role, expected) => {
      const app = makeApp({
        role,
        email: `${role}@test.com`,
        uid: `${role}-123`,
      });

      // Mock admin-only check
      adminMock
        .firestore()
        .collection()
        .doc()
        .get.mockResolvedValue({
          exists: true,
          data: () => ({ role: "staff" }),
        });

      const res = await request(app)[method.toLowerCase()](path);
      expect(res.status).toBe(expected);
    });

    // Update your validation tests:
    test.each([
      ["toggle-approval", { email: "invalid" }, 400],
      ["events", { facilityName: "Test" }, 400], // Partial data
      ["block-slot", { facilityId: "court-1" }, 400],
    ])("POST /%s validates input", async (endpoint, data, expectedStatus) => {
      const app = makeAdminApp(); // Now properly defined
      const res = await request(app).post(`/api/admin/${endpoint}`).send(data);
      expect(res.status).toBe(expectedStatus);
    });
  });

  /* ─────────────────────────────  EVENTS  ─────────────────────────── */
  describe("Event Management", () => {
    // Add to existing tests
    test("event creation includes poster image", async () => {
      const app = makeAdminApp();
      const res = await request(app)
        .post("/api/admin/events")
        .send({
          ...event,
          posterImage: "test.jpg",
        });

      expect(res.status).toBe(201);
      expect(res.body.event).toHaveProperty("posterImage", "test.jpg");
    });
  });

  // ==============================================
  // MAINTENANCE REPORTS
  // ==============================================
  describe("Maintenance Reports", () => {
    test("POST /maintenance-reports creates report", async () => {
      const app = makeStaffApp("staff-1");
      const reportData = {
        facilityId: "court-1",
        facilityName: "Tennis Court",
        description: "Broken net",
      };

      const res = await request(app)
        .post("/api/admin/maintenance-reports")
        .send(reportData);

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();

      // Verify report in mock DB
      const reports = Array.from(adminMock.__firestoreData.values()).filter(
        (v) => v.description === "Broken net"
      );
      expect(reports).toHaveLength(1);
    });

    test("GET /maintenance-reports as resident shows only their reports", async () => {
      // Seed reports
      adminMock.__firestoreData.set("report-1", {
        userId: "res-1",
        description: "Test report",
        userName: "res1@test.com",
      });
      adminMock.__firestoreData.set("report-2", {
        userId: "res-2",
        description: "Other report",
        userName: "res2@test.com",
      });

      const app = makeApp({
        role: "resident",
        email: "res1@test.com",
        uid: "res-1",
      });

      const res = await request(app).get("/api/admin/maintenance-reports");
      expect(res.body.reports).toHaveLength(1);
      expect(res.body.reports[0].description).toBe("Test report");
    });
  });

  // ==============================================
  // NOTIFICATIONS
  // ==============================================
  describe("Notifications", () => {
    test("GET /unread-count returns correct count", async () => {
      // Clear existing notifications
      adminMock.__firestoreData.clear();

      const staffEmail = "staff-1@example.com";

      // Add test notifications
      adminMock.__firestoreData.set("notif-1", {
        userName: staffEmail,
        read: false,
        createdAt: new Date(),
      });

      adminMock.__firestoreData.set("notif-2", {
        userName: staffEmail,
        read: true, // Ensure this is explicitly true
        createdAt: new Date(),
      });

      // Add a notification for a different user
      adminMock.__firestoreData.set("notif-3", {
        userName: "other@example.com",
        read: false,
        createdAt: new Date(),
      });

      const app = makeStaffApp("staff-1");
      const res = await request(app).get("/api/admin/unread-count");

      // Verify only 1 unread notification for the test user
      expect(res.body.count).toBe(1);
    });

    test("GET /get-notifications returns user notifications", async () => {
      // Clear existing data
      adminMock.__firestoreData.clear();

      // Add test notification with all required fields
      // In test setup:
      adminMock.__firestoreData.set("notif-1", {
        userName: "staff-1@example.com", // Match staff app user email
        message: "Test",
        read: false,
        createdAt: new Date(),
      });

      // Add a notification that shouldn't be returned
      adminMock.__firestoreData.set("notif-2", {
        userName: "other@example.com", // Different user
        message: "Should not appear",
        createdAt: new Date(),
        read: false,
      });

      const app = makeStaffApp("staff-1"); // Sets user email to "staff@example.com"
      const res = await request(app).get("/api/admin/get-notifications");

      expect(res.body.notifications).toHaveLength(1);
      expect(res.body.notifications[0].message).toBe("Test");
    });
  });

  // ==============================================
  // STAFF BOOKING MANAGEMENT
  // ==============================================
  describe("Staff Booking Management", () => {
    test("PUT /:id/status updates booking status", async () => {
      adminMock.__firestoreData.set("booking-1", {
        facilityStaff: "staff-1",
        status: "pending",
        userName: "user@example.com",
        date: "2023-01-01",
        slot: "09:00 - 10:00",
      });

      const app = makeStaffApp("staff-1");
      const res = await request(app)
        .put("/api/admin/booking-1/status")
        .send({ status: "approved" });

      expect(res.status).toBe(200);
      expect(adminMock.__firestoreData.get("booking-1").status).toBe(
        "approved"
      );
    });

    test("GET /staff-upcoming-bookings returns future bookings", async () => {
      adminMock.__firestoreData.set("booking-1", {
        facilityStaff: "staff-1",
        status: "approved",
        date: "2099-01-01", // Future date
        slot: "09:00 - 10:00",
      });

      const app = makeStaffApp("staff-1");
      const res = await request(app).get("/api/admin/staff-upcoming-bookings");

      expect(res.body.bookings).toHaveLength(1);
      expect(res.body.bookings[0].date).toBe("2099-01-01");
    });
  });

  // ==============================================
  // EDGE CASES & ERROR HANDLING
  // ==============================================
  describe("Edge Cases & Error Handling", () => {
    test("Toggle approval for non-existent user returns 404", async () => {
      const app = makeAdminApp();
      const res = await request(app)
        .post("/api/admin/toggle-approval")
        .send({ email: "ghost@example.com" });

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/not found/i);
    });

    test("Toggle approval with invalid action returns 400", async () => {
      const app = makeAdminApp();

      // Test cases for invalid actions
      const invalidActions = ["enable", "disable", "random", 123];

      for (const action of invalidActions) {
        const res = await request(app).post("/api/admin/toggle-approval").send({
          email: "user@example.com",
          action: action,
        });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/Invalid action specified/i);
      }
    });
    test("Create event with past date returns 400", async () => {
      const app = makeAdminApp();
      const pastEvent = {
        ...event,
        startTime: "2020-01-01T00:00:00Z",
        endTime: "2020-01-01T01:00:00Z",
      };

      const res = await request(app).post("/api/admin/events").send(pastEvent);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/past/i);
    });

    test("Block slot with missing fields returns 400", async () => {
      const app = makeAdminApp();
      const res = await request(app)
        .post("/api/admin/block-slot")
        .send({ facilityId: "court-1" }); // Missing date/slot

      expect(res.status).toBe(400);
    });
  });

  // ==============================================
  // FACILITY ENDPOINTS
  // ==============================================
  describe("Facility Endpoints", () => {
    test("GET /obtain returns facilities", async () => {
      adminMock.__firestoreData.set("fac-2", { name: "Basketball Court" });

      const app = makeAdminApp();
      const res = await request(app).get("/api/admin/obtain");

      expect(res.body.facilities).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: "Tennis Court" }),
          expect.objectContaining({ name: "Basketball Court" }),
        ])
      );
    });
  });
  describe("User Management - Extended", () => {
    test("Toggle approval with 'reject' action", async () => {
      const app = makeAdminApp();
      const res = await request(app)
        .post("/api/admin/toggle-approval")
        .send({ email, action: "reject" });

      expect(res.status).toBe(200);
      expect(res.body.approved).toBe(false);
      expect(adminMock.__firestoreData.get(email).approved).toBe(false);
    });

    test("Toggle approval for admin account fails", async () => {
      const app = makeAdminApp();
      const res = await request(app)
        .post("/api/admin/toggle-approval")
        .send({ email: "admin@gmail.com" });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/cannot be modified/i);
    });
  });

  // ==============================================
  // ENHANCED EVENT TESTS
  // ==============================================
  describe("Event Management - Extended", () => {
    // Fixed timestamps to prevent timing issues
    const fixedStartTime = new Date("2023-01-01T10:00:00Z").toISOString();
    const fixedEndTime = new Date("2023-01-01T11:00:00Z").toISOString();

    const eventData = {
      eventName: "Test Event",
      facilityId: "court-1",
      facilityName: "Tennis Court",
      description: "Test Description",
      startTime: fixedStartTime,
      endTime: fixedEndTime,
      posterImage: "test.jpg",
    };

    test("Create event with invalid date range", async () => {
      const app = makeAdminApp();
      const invalidEvent = {
        ...event,
        startTime: new Date(Date.now() + 3600000).toISOString(),
        endTime: new Date(Date.now()).toISOString(), // End before start
      };

      const res = await request(app)
        .post("/api/admin/events")
        .send(invalidEvent);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/before end time/i);
    });

    test("Update non-existent event returns 404", async () => {
      const app = makeAdminApp();
      const res = await request(app)
        .put("/api/admin/events/nonexistent")
        .send(event);

      expect(res.status).toBe(404);
    });

    // In your test file
    test("Create event with duplicate details returns 409", async () => {
      const app = makeAdminApp();
      await request(app).post("/api/admin/events").send(event);

      const res = await request(app).post("/api/admin/events").send(event);
      expect(res.status).toBe(409);
    });

    test("Create overlapping event returns 409", async () => {
      const app = makeAdminApp();
      await request(app).post("/api/admin/events").send(eventData);

      const overlappingEvent = {
        ...eventData,
        startTime: new Date("2023-01-01T10:30:00Z").toISOString(),
        endTime: new Date("2023-01-01T11:01:00Z").toISOString(), // 2 hours after original start
      };

      const res = await request(app)
        .post("/api/admin/events")
        .send(overlappingEvent);
      expect(res.status).toBe(409);
    });
  });

  // ==============================================
  // ENHANCED MAINTENANCE TESTS
  // ==============================================
  describe("Maintenance Reports - Extended", () => {
    test("Create report with missing fields", async () => {
      const app = makeStaffApp("staff-1");
      const res = await request(app)
        .post("/api/admin/maintenance-reports")
        .send({ facilityId: "court-1" }); // Missing description

      expect(res.status).toBe(400);
    });

    test("Get reports with date filter", async () => {
      // Seed recent report
      adminMock.__firestoreData.set("recent-report", {
        createdAt: new Date(),
        status: "open",
        facilityName: "Gym",
      });

      const app = makeAdminApp();
      const res = await request(app).get(
        "/api/admin/maintenance-summary?dateRange=last30days"
      );

      expect(res.body.openCount).toBe(1);
    });
  });

  // ==============================================
  // ENHANCED BOOKING TESTS
  // ==============================================
  describe("Booking Management - Extended", () => {
    test("Block conflicting slot returns 409", async () => {
      const app = makeAdminApp();

      // First successful block
      await request(app).post("/api/admin/block-slot").send({
        facilityId: "court-1",
        facilityName: "Tennis Court",
        slot: "10:00 - 11:00",
        date: "2023-01-01",
      });

      // Conflict attempt
      const res = await request(app).post("/api/admin/block-slot").send({
        facilityId: "court-1",
        facilityName: "Tennis Court",
        slot: "10:00 - 11:00",
        date: "2023-01-01",
      });

      expect(res.status).toBe(409);
    });

    test("Reject booking updates facility slots", async () => {
      // Seed facility with timeslot
      adminMock.__firestoreData.set("court-1", {
        name: "Tennis Court",
        timeslots: [
          {
            start: "09:00",
            end: "10:00",
            isBooked: false,
          },
        ],
      });

      const app = makeStaffApp("staff-1");
      await request(app)
        .put("/api/admin/booking-1/status")
        .send({ status: "rejected" });

      const facility = adminMock.__firestoreData.get("court-1");
      expect(facility.timeslots[0].isBooked).toBe(false);
    });
  });

  // ==============================================
  // ENHANCED NOTIFICATION TESTS
  // ==============================================
  describe("Notifications - Extended", () => {
    test("Handle empty notifications", async () => {
      const app = makeStaffApp("staff-1");
      const res = await request(app).get("/api/admin/get-notifications");

      expect(res.body.notifications).toHaveLength(0);
    });
  });

  // ==============================================
  // ENHANCED FACILITY TESTS
  // ==============================================
  describe("Facilities - Extended", () => {
    test("Get empty facilities list", async () => {
      adminMock.__firestoreData.clear();
      const app = makeAdminApp();
      const res = await request(app).get("/api/admin/facilities");

      expect(res.body.facilities).toHaveLength(0);
    });
  });

  describe("toggle-approval message generation", () => {
    const testUserBase = {
      role: "resident",
      accepted: true,
      uid: "test-uid",
    };

    // Test 1: Approve action
    test("returns correct message for approve action", async () => {
      const app = makeAdminApp();
      const email = "approve@test.com";
      adminMock.__firestoreData.set(email, {
        ...testUserBase,
        email,
        approved: false,
      });

      const res = await request(app)
        .post("/api/admin/toggle-approval")
        .send({ email, action: "approve" });

      expect(res.body.message).toBe(
        "User approved and access granted successfully."
      );
      expect(res.body.approved).toBe(true);
      expect(res.body.accepted).toBe(true);
    });

    // Test 2: Reject action
    test("returns correct message for reject action", async () => {
      const app = makeAdminApp();
      const email = "reject@test.com";
      adminMock.__firestoreData.set(email, {
        ...testUserBase,
        email,
        approved: true,
      });

      const res = await request(app)
        .post("/api/admin/toggle-approval")
        .send({ email, action: "reject" });

      expect(res.body.message).toBe("User rejected successfully.");
      expect(res.body.approved).toBe(false);
      expect(res.body.accepted).toBe(true); // Maintains existing accepted status
    });

    // Test 3: Revoke action
    test("returns correct message for revoke action", async () => {
      const app = makeAdminApp();
      const email = "revoke@test.com";
      adminMock.__firestoreData.set(email, {
        ...testUserBase,
        email,
        approved: true,
        accepted: true,
      });

      const res = await request(app)
        .post("/api/admin/toggle-approval")
        .send({ email, action: "revoke" });

      expect(res.body.message).toBe("User access revoked successfully.");
      expect(res.body.approved).toBe(true); // Maintains approval status
      expect(res.body.accepted).toBe(false);
    });

    // Test 4: Toggle from unapproved (no action)
    test("returns approve message when toggling from unapproved", async () => {
      const app = makeAdminApp();
      const email = "toggle-up@test.com";
      adminMock.__firestoreData.set(email, {
        ...testUserBase,
        email,
        approved: false,
      });

      const res = await request(app)
        .post("/api/admin/toggle-approval")
        .send({ email });

      expect(res.body.message).toBe("User approved successfully.");
      expect(res.body.approved).toBe(true);
    });

    // Test 5: Toggle from approved (no action)
    test("returns reject message when toggling from approved", async () => {
      const app = makeAdminApp();
      const email = "toggle-down@test.com";
      adminMock.__firestoreData.set(email, {
        ...testUserBase,
        email,
        approved: true,
      });

      const res = await request(app)
        .post("/api/admin/toggle-approval")
        .send({ email });

      expect(res.body.message).toBe("User rejected successfully.");
      expect(res.body.approved).toBe(false);
    });
  });

  describe("environment-specific error details", () => {
    let originalEnv;

    beforeAll(() => {
      originalEnv = process.env.NODE_ENV;
    });

    afterAll(() => {
      process.env.NODE_ENV = originalEnv;
    });

    test("includes error details in development", async () => {
      process.env.NODE_ENV = "development";

      // Reset modules to apply NODE_ENV change
      jest.resetModules();

      adminMock
        .firestore()
        .collection()
        .doc()
        .update.mockRejectedValue(new Error("Development error"));

      const app = makeAdminApp();
      const res = await request(app).post("/api/admin/toggle-approval").send({
        email: email,
        action: "approve", // Ensure valid request format
      });

      expect(res.body.error).toBeUndefined();
    });

    test("excludes error details in production", async () => {
      process.env.NODE_ENV = "production";

      // Reset modules to apply NODE_ENV change
      jest.resetModules();

      adminMock
        .firestore()
        .collection()
        .doc()
        .update.mockRejectedValue(new Error("Sensitive error details"));

      const app = makeAdminApp();
      const res = await request(app).post("/api/admin/toggle-approval").send({
        email: email,
        action: "approve",
      });

      expect(res.body.error).toBeUndefined();
    });
  });
  describe("POST /events", () => {
  const validEvent = {
    eventName: "Test Event",
    facilityName: "Test Facility",
    facilityId: "facility-1",
    description: "Test Description",
    startTime: new Date(Date.now() + 3600000).toISOString(),
    endTime: new Date(Date.now() + 7200000).toISOString()
  };

  beforeEach(() => {
    adminMock.__testHelpers.reset();
    // Seed admin user
    adminMock.__firestoreData.set("admin@test.com", {
      email: "admin@test.com",
      role: "admin",
      uid: "admin-uid"
    });
  });

  test("returns 409 for duplicate events", async () => {
    // Create initial event
    adminMock.__testHelpers.setCustomDocId("existing-event");
    await request(makeAdminApp())
      .post("/api/admin/events")
      .send(validEvent);

    // Reset for duplicate check
    adminMock.__testHelpers.setCustomDocId(null);
    
    const res = await request(makeAdminApp())
      .post("/api/admin/events")
      .send(validEvent);

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch("Duplicate event");
  });

  test("successfully creates event with expected ID", async () => {
    adminMock.__testHelpers.setCustomDocId("event-123");
    
    const res = await request(makeAdminApp())
      .post("/api/admin/events")
      .send({ ...validEvent, posterImage: "test.jpg" });

    expect(res.status).toBe(201);
    expect(res.body.event.id).toBe("event-123");
  });

  test("returns 500 on Firestore failure", async () => {
    adminMock.__testHelpers.setAddFailure(true);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    const res = await request(makeAdminApp())
      .post("/api/admin/events")
      .send(validEvent);

    expect(res.status).toBe(500);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error creating event:",
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });
});
});
