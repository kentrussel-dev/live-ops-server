import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { connectDB, disconnectDB } from '../config/db';
import { seedDatabase } from '../seeds/seed';

let app: any;
let editorToken: string;

beforeAll(async () => {
  await connectDB();
  await seedDatabase();
  app = createApp();

  const editorLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'editor@liveops.aetheria.gg', password: 'AetheriaOps2026!' });
  editorToken = editorLogin.body.data.token;
});

afterAll(async () => {
  await disconnectDB();
});

describe('Timeline Matrix & System Telemetry API', () => {
  it('should return aggregated tracks for events, patches, shop items, and incidents', async () => {
    const res = await request(app)
      .get('/api/v1/timeline/matrix')
      .set('Authorization', `Bearer ${editorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tracks).toBeDefined();
    expect(res.body.data.tracks.events.length).toBeGreaterThan(0);
    expect(res.body.data.tracks.patches.length).toBeGreaterThan(0);
    expect(res.body.data.tracks.shop.length).toBeGreaterThan(0);
    expect(res.body.data.tracks.incidents.length).toBeGreaterThan(0);
  });

  it('should return system stats, cluster estimates, and audit trail', async () => {
    const res = await request(app)
      .get('/api/v1/system/overview')
      .set('Authorization', `Bearer ${editorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.stats).toBeDefined();
    expect(res.body.data.stats.connectedClusters.length).toBe(4);
    expect(res.body.data.recentAuditLogs.length).toBeGreaterThan(0);
  });
});
