jest.mock('../firebase');
const request   = require('supertest');
const express   = require('express');
const adminMock = require('../firebase').admin;

/* helper that injects a fake authenticated user */
const makeApp = (uid = 'staff-1') => {
  jest.resetModules();
  jest.doMock('../authenticate', () => (_req, _res, next) => {
    _req.user = { uid, email: uid + '@mail.com', role: 'staff' };
    next();
  });

  const facilities = require('../routes/facilities');
  const app = express();
  app.use(express.json());
  app.use('/facilities', facilities);
  return app;
};

describe('FACILITIES router', () => {
  beforeEach(() => adminMock.__firestoreData.clear());

  const body = { name: 'Court A', type: 'Tennis', isOutdoors: true };

  test('upload OK', async () => {
    const app = makeApp();

    const res = await request(app)
      .post('/facilities/upload')
      .send(body);

    expect(res.status).toBe(201);
    expect(res.body.facility).toMatchObject({ name: 'Court A', type: 'Tennis' });
  });

  test('duplicate blocked *per creator* but allowed for others', async () => {
    const app1 = makeApp('u1');
    await request(app1).post('/facilities/upload').send(body).expect(201);
    await request(app1).post('/facilities/upload').send(body).expect(409); // same user

    const app2 = makeApp('u2');                            // different creator
    await request(app2).post('/facilities/upload').send(body).expect(201);
  });

  test('staff-facilities returns only own docs', async () => {
    const app1 = makeApp('u1');
    const app2 = makeApp('u2');

    await request(app1).post('/facilities/upload').send({ ...body, name: 'F1' });
    await request(app2).post('/facilities/upload').send({ ...body, name: 'F2' });

    const res = await request(app1).get('/facilities/staff-facilities');
    expect(res.body.count).toBe(1);
    expect(res.body.facilities[0].name).toBe('F1');
  });

  test('update facility', async () => {
    const app = makeApp();
    const post = await request(app).post('/facilities/upload').send(body);
    const id   = post.body.facility.id;

    const put = await request(app)
      .put(`/facilities/updateFacility/${id}`)
      .send({ name: 'Renamed', type: 'Tennis', isOutdoors: false });

    expect(put.status).toBe(200);
    expect(put.body.facility.name).toBe('Renamed');
  });

  test('delete cleans timeslots', async () => {
    const app = makeApp();
    const { body: { facility } } = await request(app).post('/facilities/upload').send(body);
    const id = facility.id;

    // seed a timeslot doc tied to that facility
    adminMock.__firestoreData.set('ts-1', { facilityId: id });

    await request(app).delete(`/facilities/${id}`).expect(200);
    expect(adminMock.__firestoreData.has(id)).toBeFalse();
    expect(adminMock.__firestoreData.has('ts-1')).toBeFalse();
  });
});

/* -------------------- ADDITIONAL BRANCH-COVERAGE TESTS -------------------- */

describe('FACILITIES router – extra branch tests', () => {
  beforeEach(() => adminMock.__firestoreData.clear());
   const body = { name: 'Court A', type: 'Tennis', isOutdoors: true };

  /* ─────────────── /facilities/upload validation paths ─────────────── */

  test('upload → 400 when required fields are missing', async () => {
    const app = makeApp();
    const res = await request(app).post('/facilities/upload').send({ name: 'X' });
    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('MISSING_REQUIRED_FIELDS');
  });

  test('upload → 400 on invalid field types', async () => {
    const app = makeApp();
    const bad = { name: 123, type: {}, isOutdoors: 'yes' };
    const res = await request(app).post('/facilities/upload').send(bad);
    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('INVALID_FIELD_TYPES');
  });

  test('upload → 400 when name/type exceed max length', async () => {
    const app = makeApp();
    const long = 'x'.repeat(101);
    const res = await request(app).post('/facilities/upload').send({
      name: long,
      type: 'Tennis',
      isOutdoors: true,
    });
    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('FIELD_TOO_LONG');
  });

  /* ─────────────────────── auth / ownership checks ─────────────────────── */

  test('updateFacility → 404 for non-owner', async () => {
    const owner = makeApp('creator');
    const { body: { facility } } = await request(owner).post('/facilities/upload').send(body);

    const intruder = makeApp('not-creator');
    const res = await request(intruder)
      .put(`/facilities/updateFacility/${facility.id}`)
      .send({ name: 'Hack' });

    expect(res.status).toBe(404);
  });

  test('delete facility → 403 for non-owner', async () => {
    const owner = makeApp('creator');
    const { body: { facility } } = await request(owner).post('/facilities/upload').send(body);

    const intruder = makeApp('not-creator');
    const res = await request(intruder).delete(`/facilities/${facility.id}`);
    expect(res.status).toBe(403);
  });

  /* ────────────────────────── misc edge branches ────────────────────────── */

  test('staff-facilities → empty list returns count 0', async () => {
    const app = makeApp('ghost');
    const res = await request(app).get('/facilities/staff-facilities');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(0);
    expect(res.body.facilities).toHaveLength(0);
  });

  test('timeslots fetch → 404 when facility does not exist', async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/facilities/timeslots')
      .send({ facilityId: 'non-existent' });
    expect(res.status).toBe(404);
  });

  test('PUT /:id/timeslots → 400 on bad slot format', async () => {
    const app = makeApp();
    const { body: { facility } } = await request(app).post('/facilities/upload').send(body);

    const res = await request(app)
      .put(`/facilities/${facility.id}/timeslots`)
      .send({ timeslots: { Monday: ['bad-format'] } });

    expect(res.status).toBe(400);
  });
});

/* --------------- MORE BRANCH-COVERAGE TESTS (timeslots + bookings) --------------- */

describe('FACILITIES router – timeslot & booking branches', () => {
  beforeEach(() => adminMock.__firestoreData.clear());

  const facilityBody = { name: 'Branch-Court', type: 'Padel', isOutdoors: false };
  const goodTemplate = {
    Monday : ['09:00 - 10:00', '10:30 - 11:30'],
    Tuesday: ['14:00 - 15:00'],
  };

  /* ───────────── PUT /:id/timeslots branches ───────────── */

  test('PUT /:id/timeslots → happy-path 200', async () => {
    const app = makeApp();
    const { body: { facility } } = await request(app).post('/facilities/upload').send(facilityBody);

    const res = await request(app)
      .put(`/facilities/${facility.id}/timeslots`)
      .send({ timeslots: goodTemplate });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/updated successfully/i);
  });

  test('PUT /:id/timeslots → 400 when slot list is not array', async () => {
    const app = makeApp();
    const { body: { facility } } = await request(app).post('/facilities/upload').send(facilityBody);

    const res = await request(app)
      .put(`/facilities/${facility.id}/timeslots`)
      .send({ timeslots: { Monday: 'not-an-array' } });

    expect(res.status).toBe(400);
  });

  test('PUT /:id/timeslots → 400 on duplicate slot same day', async () => {
    const app = makeApp();
    const { body: { facility } } = await request(app).post('/facilities/upload').send(facilityBody);

    const dup = { Monday: ['09:00 - 10:00', '09:00 - 10:00'] };
    const res = await request(app).put(`/facilities/${facility.id}/timeslots`).send({ timeslots: dup });
    expect(res.status).toBe(400);
  });

  test('PUT /:id/timeslots → 400 on overlapping slots', async () => {
    const app = makeApp();
    const { body: { facility } } = await request(app).post('/facilities/upload').send(facilityBody);

    const overlap = { Monday: ['09:00 - 10:00', '09:30 - 10:30'] };
    const res = await request(app).put(`/facilities/${facility.id}/timeslots`).send({ timeslots: overlap });
    expect(res.status).toBe(400);
  });

  /* ───────────── DELETE /:id/timeslots branches ───────────── */

  test('DELETE /:id/timeslots → success removes one slot', async () => {
    const app = makeApp('staff-A');
    const { body: { facility } } = await request(app).post('/facilities/upload').send(facilityBody);

    // seed template first
    await request(app)
      .put(`/facilities/${facility.id}/timeslots`)
      .send({ timeslots: goodTemplate });

    const res = await request(app)
      .delete(`/facilities/${facility.id}/timeslots`)
      .send({ day: 'Monday', start: '09:00', end: '10:00' });

    expect(res.status).toBe(200);
    expect(res.body.removedSlot.day).toBe('Monday');
  });

  test('DELETE /:id/timeslots → 404 when slot absent', async () => {
    const app = makeApp();
    const { body: { facility } } = await request(app).post('/facilities/upload').send(facilityBody);

    const res = await request(app)
      .delete(`/facilities/${facility.id}/timeslots`)
      .send({ day: 'Wed', start: '07:00', end: '08:00' });

    expect(res.status).toBe(404);
    expect(res.body.errorCode).toBe('TIMESLOT_NOT_FOUND');
  });

  test('DELETE /:id/timeslots → 403 unauthorized', async () => {
    const owner = makeApp('owner-uid');
    const { body: { facility } } = await request(owner).post('/facilities/upload').send(facilityBody);

    // put a template so the slot exists
    await request(owner)
      .put(`/facilities/${facility.id}/timeslots`)
      .send({ timeslots: goodTemplate });

    const intruder = makeApp('intruder-uid');
    const res = await request(intruder)
      .delete(`/facilities/${facility.id}/timeslots`)
      .send({ day: 'Monday', start: '09:00', end: '10:00' });

    expect(res.status).toBe(403);
  });

  test('DELETE /:id/timeslots → 400 when params missing', async () => {
    const app = makeApp();
    const { body: { facility } } = await request(app).post('/facilities/upload').send(facilityBody);

    const res = await request(app)
      .delete(`/facilities/${facility.id}/timeslots`)
      .send({ day: 'Monday', start: '09:00' });            // end omitted

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('MISSING_PARAMETERS');
  });

  /* ───────────── POST /bookings branches ───────────── */

  const slot = '09:00 - 10:00';
  const date = '2025-05-06';

  test('POST /bookings → 201 happy-path', async () => {
    const staff  = makeApp('creator-staff');
    const { body: { facility } } = await request(staff).post('/facilities/upload').send(facilityBody);

    const user = makeApp('player-1');
    const res  = await request(user).post('/facilities/bookings').send({
      facilityId  : facility.id,
      facilityName: facility.name,
      slot,
      selectedDate: date,
    });

    expect(res.status).toBe(201);
  });

  test('POST /bookings → 400 when required fields missing', async () => {
    const app = makeApp();
    const res = await request(app).post('/facilities/bookings').send({});
    expect(res.status).toBe(400);
  });

  test('POST /bookings → 409 on duplicate booking by same user', async () => {
    const staff  = makeApp('creator-staff');
    const { body: { facility } } = await request(staff).post('/facilities/upload').send(facilityBody);

    const user = makeApp('dup-player');
    await request(user).post('/facilities/bookings').send({
      facilityId  : facility.id,
      facilityName: facility.name,
      slot,
      selectedDate: date,
    }).expect(201);

    await request(user).post('/facilities/bookings').send({
      facilityId  : facility.id,
      facilityName: facility.name,
      slot,
      selectedDate: date,
    }).expect(409);
  });

  test('POST /bookings → 409 when slot already full', async () => {
    const staff  = makeApp('creator-staff');
    const { body: { facility } } = await request(staff).post('/facilities/upload').send(facilityBody);

    const first  = makeApp('player-A');
    const second = makeApp('player-B');

    // first booking succeeds
    await request(first).post('/facilities/bookings').send({
      facilityId  : facility.id,
      facilityName: facility.name,
      slot,
      selectedDate: date,
    }).expect(201);

    // second (different user) should hit capacity check
    const res = await request(second).post('/facilities/bookings').send({
      facilityId  : facility.id,
      facilityName: facility.name,
      slot,
      selectedDate: date,
    });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/fully booked/i);
  });

  /* ───────────── tiny maintenance-fetch happy path ───────────── */

  test('staff-maintenance-requests → empty array OK', async () => {
    const app = makeApp('maint-staff');
    const res = await request(app).get('/facilities/staff-maintenance-requests');
    expect(res.status).toBe(200);
    expect(res.body.reports).toHaveLength(0);
  });
});

/* ---------------------- POST /upload VALIDATION EXTENSIONS ---------------------- */

describe('POST /facilities/upload – extended validation', () => {
  beforeEach(() => adminMock.__firestoreData.clear());

  test('rejects description over 500 chars', async () => {
    const app = makeApp();
    const res = await request(app).post('/facilities/upload').send({
      name: 'Test',
      type: 'Type',
      isOutdoors: true,
      description: 'x'.repeat(501),
    });
    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('DESCRIPTION_TOO_LONG');
  });

  test('accepts valid features array', async () => {
    const app = makeApp();
    const res = await request(app).post('/facilities/upload').send({
      name: 'Test',
      type: 'Type',
      isOutdoors: true,
      features: ['lighting', 'showers'],
    });
    expect(res.status).toBe(201);
    expect(res.body.facility.features).toEqual(['lighting', 'showers']);
  });

  test('rejects non-array features', async () => {
    const app = makeApp();
    const res = await request(app).post('/facilities/upload').send({
      name: 'Test',
      type: 'Type',
      isOutdoors: true,
      features: 'not-an-array',
    });
    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('INVALID_FEATURES');
  });
});

/* ------------------------ COORDINATES VALIDATION TESTS ------------------------- */

describe('Facility coordinates handling', () => {
  test('stores valid coordinates', async () => {
    const app = makeApp();
    const res = await request(app).post('/facilities/upload').send({
      name: 'GeoTest',
      type: 'Geo',
      isOutdoors: true,
      coordinates: { lat: 40.7128, lng: -74.0060 },
    });
    
    expect(res.status).toBe(201);
    expect(res.body.facility.coordinates).toEqual({
      lat: 40.7128,
      lng: -74.0060,
    });
  });

  test('ignores invalid coordinate types', async () => {
    const app = makeApp();
    const res = await request(app).post('/facilities/upload').send({
      name: 'BadGeo',
      type: 'Geo',
      isOutdoors: true,
      coordinates: { lat: 'forty', lng: -74.0060 },
    });
    
    expect(res.status).toBe(201);
    expect(res.body.facility.coordinates).toBeNull();
  });
});

/* ---------------------- UPDATE FACILITY FIELD VALIDATION ----------------------- */

describe('PUT /updateFacility/:id – field updates', () => {
  let facilityId;

  beforeEach(async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/facilities/upload')
      .send({ name: 'UpdateTest', type: 'Test', isOutdoors: true });
    facilityId = res.body.facility.id;
  });

  test('updates description successfully', async () => {
    const app = makeApp();
    const res = await request(app)
      .put(`/facilities/updateFacility/${facilityId}`)
      .send({
        name: 'UpdateTest',
        type: 'Test',
        isOutdoors: true,
        description: 'New description',
      });
    
    expect(res.status).toBe(200);
    expect(res.body.facility.description).toBe('New description');
  });

  test('clears description when empty string provided', async () => {
    const app = makeApp();
    const res = await request(app)
      .put(`/facilities/updateFacility/${facilityId}`)
      .send({
        name: 'UpdateTest',
        type: 'Test',
        isOutdoors: true,
        description: '',
      });
    
    expect(res.status).toBe(200);
    expect(res.body.facility.description).toBe('');
  });

  test('rejects non-string features array', async () => {
    const app = makeApp();
    const res = await request(app)
      .put(`/facilities/updateFacility/${facilityId}`)
      .send({
        name: 'UpdateTest',
        type: 'Test',
        isOutdoors: true,
        features: [123, true],
      });
    
    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe('INVALID_FEATURES');
  });
});

/* ------------------------ FACILITY DELETION EDGE CASES ------------------------- */

describe('DELETE /:id – edge cases', () => {
  test('deletes facility with no timeslots', async () => {
    const app = makeApp();
    const postRes = await request(app)
      .post('/facilities/upload')
      .send({ name: 'NoSlots', type: 'Test', isOutdoors: true });
    
    const delRes = await request(app).delete(`/facilities/${postRes.body.facility.id}`);
    expect(delRes.status).toBe(200);
    expect(adminMock.__firestoreData.has(postRes.body.facility.id)).toBeFalse();
  });
});

/* ------------------------- FACILITY GET ENDPOINT TESTS ------------------------- */

describe('GET /:id – extended cases', () => {
  test('returns 404 for non-existent facility', async () => {
    const app = makeApp();
    const res = await request(app).get('/facilities/non-existent-id');
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });

  test('includes all fields in response', async () => {
    const app = makeApp();
    const postRes = await request(app).post('/facilities/upload').send({
      name: 'FullFacility',
      type: 'Full',
      isOutdoors: true,
      description: 'Complete description',
      features: ['feature1', 'feature2'],
      coordinates: { lat: 35.6895, lng: 139.6917 },
    });
    
    const getRes = await request(app).get(`/facilities/${postRes.body.facility.id}`);
    expect(getRes.body).toMatchObject({
      description: 'Complete description',
      features: ['feature1', 'feature2'],
      coordinates: { lat: 35.6895, lng: 139.6917 },
    });
  });
});

/* ---------------------- MAINTENANCE REPORT EDGE CASES ---------------------- */

describe('Maintenance report operations', () => {
  test('handles non-existent report update', async () => {
    const app = makeApp();
    const res = await request(app)
      .put('/facilities/updateReportStatus/non-existent')
      .send({ status: 'resolved' });
    
    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
  });

  test('rejects invalid status values', async () => {
    // Seed a report
    const app = makeApp('staff-1');
    await adminMock.__firestoreData.set('report-1', {
      facilityStaff: 'staff-1',
      status: 'pending',
    });

    const res = await request(app)
      .put('/facilities/updateReportStatus/report-1')
      .send({ status: 'invalid-status' });
    
    expect(res.status).toBe(400); // Assuming status validation exists
  });
});

/* ----------------------- TIMESLOT VALIDATION EXTENSIONS ----------------------- */

describe('Timeslot operations – validation extensions', () => {
  let facilityId;

  beforeEach(async () => {
    const app = makeApp();
    const res = await request(app)
      .post('/facilities/upload')
      .send({ name: 'TimeslotTest', type: 'Test', isOutdoors: true });
    facilityId = res.body.facility.id;
  });

  test('rejects non-object timeslots structure', async () => {
    const app = makeApp();
    const res = await request(app)
      .put(`/facilities/${facilityId}/timeslots`)
      .send({ timeslots: 'not-an-object' });
    
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid/i);
  });

  test('handles empty timeslots object', async () => {
    const app = makeApp();
    const res = await request(app)
      .put(`/facilities/${facilityId}/timeslots`)
      .send({ timeslots: {} });
    
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/updated/i);
  });
});