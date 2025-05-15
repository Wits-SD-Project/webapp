/* eslint-disable max-lines */
jest.mock('../firebase');                     // ← use your mock
const request   = require('supertest');
const express   = require('express');
const adminMock = require('../firebase').admin;

// ☑️ helper to mount with a fake user
const makeApp = (mockUser = {}) => {
  jest.resetModules();                        // flush Express cache
  jest.doMock('../authenticate', () => (_req, _res, next) => {
    _req.user = mockUser;
    next();
  });

  const adminRoutes = require('../routes/admin');
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRoutes);
  return app;
};

describe('ADMIN router', () => {
  const email     = 'user@example.com';
  const adminMail = 'admin@example.com';
  const uid       = 'uid-123';

  beforeEach(() => {
    adminMock.__firestoreData.clear();

    // seed an admin user + normal user
    adminMock.__firestoreData.set(adminMail, { email: adminMail, uid: 'root', role: 'admin', approved: true, accepted: true });
    adminMock.__firestoreData.set(email,     { email,        uid, role: 'resident', approved: false, accepted: true });
  });

  /* ─────────────────────────  USER MANAGEMENT  ───────────────────── */

  test('toggle approval', async () => {
    const app = makeApp({ email: adminMail, role: 'admin', uid: 'root' });

    const res = await request(app)
      .post('/api/admin/toggle-approval')
      .send({ email });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ approved: true });
    expect(adminMock.__firestoreData.get(email).approved).toBe(true);
  });

  test('list users', async () => {
    const app = makeApp({ email: adminMail, role: 'admin' });

    const res = await request(app).get('/api/admin/users');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ email }),
        expect.objectContaining({ email: adminMail }),
      ]),
    );
  });

  /* ─────────────────────────────  EVENTS  ─────────────────────────── */

  const event = {
    eventName : 'Launch Day',
    facility  : 'Hall A',
    facilityId: 'fac-1',
    description: 'test',
    startTime : new Date(Date.now() + 60_000).toISOString(),
    endTime   : new Date(Date.now() + 3_600_000).toISOString(),
  };

  test('create → update → list → delete event', async () => {
    const app = makeApp({ email: adminMail, role: 'admin', uid: 'root' });

    /* create */
    const create = await request(app).post('/api/admin/events').send(event);
    expect(create.status).toBe(201);
    const id = create.body.event.id;

    /* update */
    const update = await request(app)
      .put(`/api/admin/events/${id}`)
      .send({ ...event, description: 'updated' });
    expect(update.status).toBe(200);
    expect(update.body.event.description).toBe('updated');

    /* duplicate prevent */
    const dup = await request(app).post('/api/admin/events').send(event);
    expect(dup.status).toBe(409);

    /* list */
    const list = await request(app).get('/api/admin/events');
    expect(list.status).toBe(200);
    expect(list.body.events).toHaveLength(1);

    /* delete */
    const del = await request(app).delete(`/api/admin/events/${id}`);
    expect(del.status).toBe(200);
  });

  /* ─────────────────────  MAINTENANCE SUMMARY  ───────────────────── */

  test('maintenance summary groups by facility', async () => {
    // seed a report
    adminMock.__firestoreData.set('issue-1', {
      facilityName: 'Gym',
      status: 'open',
      createdAt: new Date(),
    });

    const app = makeApp({ email: adminMail, role: 'admin' });
    const res = await request(app).get('/api/admin/maintenance-summary');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      openCount: 1,
      closedCount: 0,
      groupedByFacility: { Gym: { open: 1, closed: 0 } },
    });
  });

  /* ─────────────────────────  FACILITIES  ────────────────────────── */

  test('get all facilities', async () => {
    adminMock.__firestoreData.set('fac-1', { name: 'Main Court' });

    const app = makeApp({ email: adminMail, role: 'admin' });
    const res = await request(app).get('/api/admin/facilities');

    expect(res.status).toBe(200);
    expect(res.body.facilities).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'Main Court' })]),
    );
  });

  /* ────────────────────────  AUTHZ NEGATIVE  ─────────────────────── */

  test('non-admin blocked', async () => {
    const app = makeApp({ email, role: 'resident' });
    const res = await request(app).get('/api/admin/users');
    expect(res.status).toBe(403);
  });
});
