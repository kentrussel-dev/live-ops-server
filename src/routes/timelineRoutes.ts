import { Router } from 'express';
import { getTimelineMatrix } from '../controllers/timelineController';
import { authenticateToken } from '../middleware/auth';

export const timelineRouter = Router();

timelineRouter.use(authenticateToken);
timelineRouter.get('/matrix', getTimelineMatrix);
