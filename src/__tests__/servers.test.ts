import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { connectDB, disconnectDB } from '../config/db';
import { seedDatabase } from '../seeds/seed';

let app: any;
let adminToken = '';
let editorToken = '';

beforeAll(async () => {
  await connectDB();
  await seedDatabase();
  app = createApp();

  const adminLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@studio.aetheria.gg', password: 'AetheriaOps2026!' });
  adminToken = adminLogin.body.data.token;

  const editorLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'editor@liveops.aetheria.gg', password: 'AetheriaOps2026!' });
  editorToken = editorLogin.body.data.token;
});

afterAll(async () => {
  await disconnectDB();
});

describe('Technical Game Server Fleet & SRE Telemetry Endpoints', () => {
  let createdServerId = '';

  it('1. Authenticated operators can fetch server fleet and telemetry', async () => {
    const res = await request(app)
      .get('/api/v1/servers')
      .set('Authorization', `Bearer ${editorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.servers.length).toBeGreaterThan(0);
    expect(res.body.data.fleetSummary.totalCcu).toBeGreaterThan(0);
    expect(res.body.data.fleetSummary.avgPingMs).toBeGreaterThan(0);
    expect(res.body.data.fleetSummary.avgTickRateHz).toBeGreaterThan(0);
  });

  it('2. Root Admin can provision a new technical game server', async () => {
    const res = await request(app)
      .post('/api/v1/servers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        serverId: 'srv-saeast-01',
        name: 'SA-East Dedicated Server 01',
        host: '177.185.200.10:7777',
        region: 'SA-East',
        maxPlayers: 4000,
        tickRateHz: 60.0,
        pingMs: 110,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.server.name).toBe('SA-East Dedicated Server 01');
    createdServerId = res.body.data.server._id;
  });

  it('3. Non-admin (liveops_editor) is forbidden from provisioning servers (403)', async () => {
    const res = await request(app)
      .post('/api/v1/servers')
      .set('Authorization', `Bearer ${editorToken}`)
      .send({
        serverId: 'srv-illegal',
        name: 'Illegal Server',
        host: '127.0.0.1:7777',
        region: 'US-East',
      });

    expect(res.status).toBe(403);
  });

  it('4. Root Admin can toggle server player traffic draining', async () => {
    const drainRes = await request(app)
      .patch(`/api/v1/servers/${createdServerId}/drain`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(drainRes.status).toBe(200);
    expect(drainRes.body.success).toBe(true);
    expect(drainRes.body.data.server.status).toBe('draining');
    expect(drainRes.body.data.server.lockedForLogins).toBe(true);
  });

  it('5. Root Admin can reboot a server node', async () => {
    const rebootRes = await request(app)
      .post(`/api/v1/servers/${createdServerId}/reboot`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(rebootRes.status).toBe(200);
    expect(rebootRes.body.success).toBe(true);
    expect(rebootRes.body.data.server.currentPlayers).toBe(0);
    expect(rebootRes.body.data.server.status).toBe('online');
  });

  it('6. Root Admin can decommission a server node', async () => {
    const deleteRes = await request(app)
      .delete(`/api/v1/servers/${createdServerId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);
  });

  it('7. Root Admin can generate the full game server fleet preset', async () => {
    const presetRes = await request(app)
      .post('/api/v1/servers/preset')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(presetRes.status).toBe(201);
    expect(presetRes.body.success).toBe(true);
    expect(presetRes.body.data.count).toBeGreaterThanOrEqual(6);
  });

  it('8. Root Admin can manually edit any server telemetry and config', async () => {
    const listRes = await request(app)
      .get('/api/v1/servers')
      .set('Authorization', `Bearer ${adminToken}`);

    const firstServer = listRes.body.data.servers[0];

    const editRes = await request(app)
      .put(`/api/v1/servers/${firstServer._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'US-East Overclocked Dedicated 01',
        pingMs: 12,
        currentPlayers: 4990,
        cpuUsagePct: 92.5,
      });

    expect(editRes.status).toBe(200);
    expect(editRes.body.success).toBe(true);
    expect(editRes.body.data.server.name).toBe('US-East Overclocked Dedicated 01');
    expect(editRes.body.data.server.pingMs).toBe(12);
    expect(editRes.body.data.server.currentPlayers).toBe(4990);
  });

  it('9. Root Admin can seed the complete Content Operations preset', async () => {
    const contentRes = await request(app)
      .post('/api/v1/servers/preset/content')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(contentRes.status).toBe(201);
    expect(contentRes.body.success).toBe(true);
    expect(contentRes.body.data.counts.events).toBeGreaterThan(0);
    expect(contentRes.body.data.counts.patches).toBeGreaterThan(0);
    expect(contentRes.body.data.counts.shopItems).toBeGreaterThan(0);
    expect(contentRes.body.data.counts.issues).toBeGreaterThan(0);
  });

  it('10. Root Admin can clear all Content Operations preset records', async () => {
    const clearContentRes = await request(app)
      .delete('/api/v1/servers/preset/content')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(clearContentRes.status).toBe(200);
    expect(clearContentRes.body.success).toBe(true);
  });

  it('11. Root Admin can clear the entire Game Server fleet', async () => {
    const clearFleetRes = await request(app)
      .delete('/api/v1/servers/preset/fleet')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(clearFleetRes.status).toBe(200);
    expect(clearFleetRes.body.success).toBe(true);

    const listRes = await request(app)
      .get('/api/v1/servers')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.body.data.servers.length).toBe(0);
  });
});
