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

describe('Patch Notes API & Version Diffing', () => {
  it('should list all patch notes with sections', async () => {
    const res = await request(app)
      .get('/api/v1/patches')
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.patches.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data.patches[0].version).toBeDefined();
  });

  it('should allow liveops_editor to create and publish a new patch note', async () => {
    const createRes = await request(app)
      .post('/api/v1/patches')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        version: 'v2.4.2-hotfix.2',
        clientBuildNumber: '242.02',
        serverBuildNumber: '242.01',
        title: 'Emergency Memory Leak & Collision Patch',
        summary: 'Targeted fix for iOS 17 terrain glitching.',
        status: 'draft',
        targetPublishTime: new Date(Date.now() + 86400000).toISOString(),
        requiresMaintenance: true,
        maintenanceDurationMinutes: 30,
        sections: [
          {
            id: 'sec-fix-test',
            title: 'Fixes',
            category: 'bug_fixes',
            items: ['Resolved terrain clipping bug in Zone 2.'],
          },
        ],
      });

    expect(createRes.status).toBe(201);
    const patchId = createRes.body.data.patch._id;

    // Publish
    const publishRes = await request(app)
      .post(`/api/v1/patches/${patchId}/publish`)
      .set('Authorization', `Bearer ${editorToken}`);

    expect(publishRes.status).toBe(200);
    expect(publishRes.body.data.patch.status).toBe('published');
    expect(publishRes.body.data.patch.publishedAt).toBeDefined();
  });
});
