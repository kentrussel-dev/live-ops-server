import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { connectDB, disconnectDB } from '../config/db';
import { seedDatabase } from '../seeds/seed';

let app: any;
let editorToken: string;
let viewerToken: string;

beforeAll(async () => {
  await connectDB();
  await seedDatabase();
  app = createApp();

  const editorLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'editor@liveops.aetheria.gg', password: 'AetheriaOps2026!' });
  editorToken = editorLogin.body.data.token;

  const viewerLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'viewer@qa.aetheria.gg', password: 'AetheriaOps2026!' });
  viewerToken = viewerLogin.body.data.token;
});

afterAll(async () => {
  await disconnectDB();
});

describe('Game Events API & RBAC Enforcement', () => {
  it('should allow both editor and viewer to list game events', async () => {
    const res = await request(app)
      .get('/api/v1/events')
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.events.length).toBeGreaterThan(0);
  });

  it('should forbid readonly_viewer from creating a new event (403)', async () => {
    const res = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        name: 'Unauthorized Event Attempt',
        slug: 'unauthorized-event',
        description: 'Should be rejected',
        category: 'raid',
        schedule: {
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 86400000).toISOString(),
        },
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ERR_FORBIDDEN_ROLE');
  });

  it('should allow liveops_editor to create a new event', async () => {
    const res = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        name: 'Shadow Realm Raid Test',
        slug: 'shadow-realm-raid-test',
        description: 'Automated test raid event description.',
        category: 'raid',
        status: 'draft',
        schedule: {
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 3 * 86400000).toISOString(),
          timezone: 'UTC',
          recurrence: 'none',
        },
        targeting: {
          playerSegments: ['all'],
          serverClusters: ['Global'],
          minLevel: 50,
        },
        config: {
          expMultiplier: 2.0,
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.data.event.slug).toBe('shadow-realm-raid-test');
    expect(res.body.data.event.audit.createdBy).toBe('ops_lead');
  });

  it('should reject invalid schedule where endTime is earlier than startTime', async () => {
    const res = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        name: 'Bad Schedule Event',
        slug: 'bad-schedule-event',
        description: 'Start after end',
        category: 'raid',
        status: 'draft',
        schedule: {
          startTime: new Date(Date.now() + 86400000).toISOString(),
          endTime: new Date().toISOString(),
        },
        targeting: {
          playerSegments: ['all'],
          serverClusters: ['Global'],
        },
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('ERR_INVALID_SCHEDULE');
  });

  it('should allow fast emergency toggling of event status and log audit trail', async () => {
    const listRes = await request(app)
      .get('/api/v1/events?search=Void Leviathan')
      .set('Authorization', `Bearer ${editorToken}`);

    const event = listRes.body.data.events[0];
    expect(event).toBeDefined();

    const toggleRes = await request(app)
      .patch(`/api/v1/events/${event._id}/toggle`)
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        status: 'paused',
        reason: 'Emergency testing pause',
      });

    expect(toggleRes.status).toBe(200);
    expect(toggleRes.body.data.event.status).toBe('paused');

    // Verify audit logs captured this
    const auditRes = await request(app)
      .get('/api/v1/system/audit-logs?entityType=event')
      .set('Authorization', `Bearer ${editorToken}`);

    expect(auditRes.status).toBe(200);
    const lastAudit = auditRes.body.data.logs[0];
    expect(lastAudit.action).toBe('EVENT_STATUS_TOGGLED');
  });
});
