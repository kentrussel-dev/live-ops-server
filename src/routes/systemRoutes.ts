import { Router } from 'express';
import { getSystemOverview, getAuditLogs } from '../controllers/systemController';
import { authenticateToken } from '../middleware/auth';

export const systemRouter = Router();

systemRouter.use(authenticateToken);
systemRouter.get('/overview', getSystemOverview);
systemRouter.get('/audit-logs', getAuditLogs);
