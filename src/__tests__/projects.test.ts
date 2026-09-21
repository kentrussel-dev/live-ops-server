import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { connectDB, disconnectDB } from '../config/db';
import { setupTestFixtures } from './testFixtures';

let app: any;
let adminToken: string;
let devToken: string;
let viewerToken: string;

beforeAll(async () => {
  await connectDB();
  await setupTestFixtures();
  app = createApp();

  const adminLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@studio.aetheria.gg', password: 'AetheriaOps2026!' });
  adminToken = adminLogin.body.data.token;

  const devLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'dev@engineering.aetheria.gg', password: 'AetheriaOps2026!' });
  devToken = devLogin.body.data.token;

  const viewerLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'viewer@qa.aetheria.gg', password: 'AetheriaOps2026!' });
  viewerToken = viewerLogin.body.data.token;
});

afterAll(async () => {
  await disconnectDB();
});

describe('Projects & Dynamic Kanban Board API', () => {
  let createdProjectId: string;

  it('should allow developer to create a new project with default columns (todo, doing, develop, testing, done)', async () => {
    const res = await request(app)
      .post('/api/v1/projects')
      .set('Authorization', `Bearer ${devToken}`)
      .send({
        name: 'Alpha Gameplay Systems',
        key: 'AGS',
        description: 'Core combat and inventory subsystems',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.project.name).toBe('Alpha Gameplay Systems');
    expect(res.body.data.project.key).toBe('AGS');
    expect(res.body.data.project.columns.length).toBe(5);

    const columnIds = res.body.data.project.columns.map((c: any) => c.id);
    expect(columnIds).toEqual(['todo', 'doing', 'develop', 'testing', 'done']);

    createdProjectId = res.body.data.project._id;
  });

  it('should allow QA (readonly_viewer) to add a card to the project in Develop stage', async () => {
    const res = await request(app)
      .post('/api/v1/issues')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        ticketKey: 'AGS-001',
        title: 'Fix combo multiplier reset timing in dual dagger stance',
        description: 'Window for secondary combo input expires 200ms prematurely.',
        category: 'combat_balance',
        severity: 'very_high',
        status: 'develop',
        projectId: createdProjectId,
        reproductionSteps: ['Equip daggers', 'Perform attack 1 then attack 2'],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.issue.status).toBe('develop');
    expect(res.body.data.issue.projectId).toBe(createdProjectId);
  });

  it('should allow developer to add a custom column to the Kanban board', async () => {
    const getRes = await request(app)
      .get(`/api/v1/projects/${createdProjectId}`)
      .set('Authorization', `Bearer ${devToken}`);

    const existingColumns = getRes.body.data.project.columns;
    const updatedColumns = [
      ...existingColumns,
      { id: 'code-review', name: 'Code Review', order: existingColumns.length },
    ];

    const patchRes = await request(app)
      .patch(`/api/v1/projects/${createdProjectId}/columns`)
      .set('Authorization', `Bearer ${devToken}`)
      .send({ columns: updatedColumns });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.project.columns.length).toBe(6);
    expect(patchRes.body.data.project.columns.some((c: any) => c.id === 'code-review')).toBe(true);
  });

  it('should allow QA to remove a column from the Kanban board', async () => {
    const getRes = await request(app)
      .get(`/api/v1/projects/${createdProjectId}`)
      .set('Authorization', `Bearer ${viewerToken}`);

    const existingColumns = getRes.body.data.project.columns;
    const filteredColumns = existingColumns.filter((c: any) => c.id !== 'code-review');

    const patchRes = await request(app)
      .patch(`/api/v1/projects/${createdProjectId}/columns`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ columns: filteredColumns });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.project.columns.length).toBe(5);
  });
});
