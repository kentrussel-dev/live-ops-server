import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { connectDB } from '../config/db';
import { seedDatabase } from '../seeds/seed';
import { IssueTicket } from '../models/IssueTicket';
import { Notification } from '../models/Notification';
import { User } from '../models/User';

const app = createApp();
let adminToken = '';
let adminUser: any = null;
let sampleIssue: any = null;

beforeAll(async () => {
  await connectDB();
  await seedDatabase();

  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@studio.aetheria.gg', password: 'AetheriaOps2026!' });
  adminToken = loginRes.body.data.token;
  adminUser = loginRes.body.data.user;

  sampleIssue = await IssueTicket.findOne();
});

describe('Operator Inbox & Notification Endpoints', () => {
  let createdNotifId = '';

  it('1. GET /api/v1/notifications - Returns list of operator notifications', async () => {
    const res = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.notifications)).toBe(true);
    expect(res.body.data.notifications.length).toBeGreaterThan(0);
    createdNotifId = res.body.data.notifications[0]._id;
  });

  it('2. GET /api/v1/notifications/unread-count - Returns accurate unread counter', async () => {
    const res = await request(app)
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.unreadCount).toBe('number');
  });

  it('3. PATCH /api/v1/notifications/:id/read - Marks individual notification as read', async () => {
    const res = await request(app)
      .patch(`/api/v1/notifications/${createdNotifId}/read`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.notification.isRead).toBe(true);
  });

  it('4. POST /api/v1/issues/:id/assign - Assigning ticket dispatches real-time notification', async () => {
    const assignRes = await request(app)
      .post(`/api/v1/issues/${sampleIssue._id}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        assignedTo: adminUser.username,
        note: 'Assigned to root_admin for priority review.',
      });

    expect(assignRes.status).toBe(200);
    expect(assignRes.body.success).toBe(true);

    const notif = await Notification.findOne({
      recipientId: adminUser._id,
      type: 'ticket_assigned',
      entityId: sampleIssue._id.toString(),
    }).sort({ createdAt: -1 });

    expect(notif).not.toBeNull();
    expect(notif?.title).toContain(sampleIssue.ticketKey);
  });

  it('5. POST /api/v1/notifications/mark-all-read - Marks all operator notifications as read', async () => {
    const res = await request(app)
      .post('/api/v1/notifications/mark-all-read')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.unreadCount).toBe(0);
  });
});
