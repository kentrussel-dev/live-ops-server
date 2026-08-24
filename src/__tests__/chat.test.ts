import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { connectDB } from '../config/db';
import { seedDatabase } from '../seeds/seed';
import { User } from '../models/User';

const app = createApp();
let adminToken = '';
let editorToken = '';
let targetUser: any = null;

beforeAll(async () => {
  await connectDB();
  await seedDatabase();

  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@studio.aetheria.gg', password: 'AetheriaOps2026!' });
  adminToken = loginRes.body.data.token;

  const editorRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'editor@liveops.aetheria.gg', password: 'AetheriaOps2026!' });
  editorToken = editorRes.body.data.token;

  targetUser = await User.findOne({ username: 'Christian Roi S. Neri' });
});

describe('Discuss Hub, Channels & Real-Time Chat Endpoints', () => {
  let createdChannelId = '';

  it('1. GET /api/v1/chat/channels - Returns list of public channels', async () => {
    const res = await request(app)
      .get('/api/v1/chat/channels')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.channels)).toBe(true);
    expect(res.body.data.channels.length).toBeGreaterThan(0);
  });

  it('2. POST /api/v1/chat/channels - Can create a new channel', async () => {
    const res = await request(app)
      .post('/api/v1/chat/channels')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Engine Core Sync',
        description: 'Physics engine, memory buffers and netcode profiling.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.channel.name).toBe('Engine Core Sync');
    createdChannelId = res.body.data.channel._id;
  });

  it('3. POST /api/v1/chat/channels/:channelId/messages - Can send a message to a channel', async () => {
    const res = await request(app)
      .post(`/api/v1/chat/channels/${createdChannelId}/messages`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        content: 'Engine build 240.108 physics collision patch verified on staging cluster.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message.content).toContain('physics collision patch');
  });

  it('4. GET /api/v1/chat/channels/:channelId/messages - Returns message stream history', async () => {
    const res = await request(app)
      .get(`/api/v1/chat/channels/${createdChannelId}/messages`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.messages.length).toBe(1);
  });

  it('5. GET /api/v1/chat/dm/:targetUserId - Initiates or retrieves direct message channel', async () => {
    const res = await request(app)
      .get(`/api/v1/chat/dm/${targetUser._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.channel.isDirectMessage).toBe(true);
  });
});
