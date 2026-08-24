import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { connectDB, disconnectDB } from '../config/db';
import { seedDatabase } from '../seeds/seed';
import { ENV } from '../config/env';

let app: any;

beforeAll(async () => {
  await connectDB();
  await seedDatabase();
  app = createApp();
});

afterAll(async () => {
  await disconnectDB();
});

describe('Auth & Root Admin Management Endpoints', () => {
  let adminToken = '';
  let editorToken = '';

  it('should reject invalid credentials with 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'editor@liveops.aetheria.gg',
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('ERR_INVALID_CREDENTIALS');
  });

  it('should authenticate liveops_editor successfully and return JWT', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'editor@liveops.aetheria.gg',
        password: 'AetheriaOps2026!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('liveops_editor');
    editorToken = res.body.data.token;
  });

  it('should reject master key bootstrap with invalid key (403)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/master-bootstrap')
      .send({
        masterKey: 'WrongKey!',
        username: 'root_owner',
        email: 'owner@studio.aetheria.gg',
        password: 'OwnerPassword2026!',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ERR_INVALID_MASTER_KEY');
  });

  it('should bootstrap Root Admin with valid Master Key (201)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/master-bootstrap')
      .send({
        masterKey: ENV.ROOT_ADMIN_KEY,
        username: 'root_owner',
        email: 'owner@studio.aetheria.gg',
        password: 'OwnerPassword2026!',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('admin');
    adminToken = res.body.data.token;
  });

  it('should allow Root Admin to list all operators', async () => {
    const res = await request(app)
      .get('/api/v1/auth/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.users.length).toBeGreaterThan(0);
  });

  it('should forbid non-admin (editor) from provisioning users (403)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/users')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        username: 'unauthorized_user',
        email: 'unauth@aetheria.gg',
        password: 'Password123!',
        role: 'readonly_viewer',
      });

    expect(res.status).toBe(403);
  });

  it('should allow Root Admin to provision a new operator', async () => {
    const res = await request(app)
      .post('/api/v1/auth/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: 'new_qa_lead',
        email: 'qalead@aetheria.gg',
        password: 'QaLeadPassword2026!',
        role: 'readonly_viewer',
        department: 'Quality Assurance',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.username).toBe('new_qa_lead');
  });
});
