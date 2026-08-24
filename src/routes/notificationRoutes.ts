import { Router } from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../controllers/notificationController';
import { authenticateToken } from '../middleware/auth';

export const notificationRouter = Router();

notificationRouter.use(authenticateToken);

notificationRouter.get('/', getNotifications);
notificationRouter.get('/unread-count', getUnreadCount);
notificationRouter.patch('/:id/read', markAsRead);
notificationRouter.post('/mark-all-read', markAllAsRead);
