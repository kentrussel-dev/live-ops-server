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

describe('Known Issues Pipeline API', () => {
  it('should return pipeline tickets with status breakdown stats', async () => {
    const res = await request(app)
      .get('/api/v1/issues')
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.issues.length).toBeGreaterThan(0);
    expect(res.body.data.stats).toBeDefined();
    expect(res.body.data.stats.criticalBlockers).toBeGreaterThanOrEqual(1);
  });

  it('should allow readonly_viewer (QA) to report a new issue ticket', async () => {
    const res = await request(app)
      .post('/api/v1/issues')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        ticketKey: 'ISSUE-9999',
        title: 'UI Clipping on iPhone 15 Dynamic Island in Inventory View',
        description: 'Top edge of gear comparison drawer gets obscured behind island cutout.',
        category: 'ui_glitch',
        severity: 'minor',
        status: 'reported',
        reproductionSteps: ['Open inventory', 'Tap second ring slot', 'Compare with equipped'],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.issue.reportedBy).toBe('qa_auditor');
  });

  it('should allow liveops_editor to advance status pipeline to fixed with resolution notes', async () => {
    const listRes = await request(app)
      .get('/api/v1/issues?search=ISSUE-9999')
      .set('Authorization', `Bearer ${editorToken}`);

    const issue = listRes.body.data.issues[0];
    expect(issue).toBeDefined();

    const updateRes = await request(app)
      .patch(`/api/v1/issues/${issue._id}/status`)
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        status: 'fixed',
        note: 'Applied safe-area-inset-top padding in InventoryDrawer.vue',
        resolutionNotes: 'Fixed in build 241.15',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.issue.status).toBe('fixed');
    expect(updateRes.body.data.issue.resolutionNotes).toBe('Fixed in build 241.15');
  });
});
