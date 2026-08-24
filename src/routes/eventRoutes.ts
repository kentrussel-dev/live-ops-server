import { Router } from 'express';
import {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  toggleEventStatus,
  deleteEvent,
  createEventSchema,
  updateEventSchema,
  toggleEventSchema,
} from '../controllers/eventController';
import { authenticateToken, requireRoles } from '../middleware/auth';
import { validateSchema } from '../middleware/validate';

export const eventRouter = Router();

// All event routes require valid authentication
eventRouter.use(authenticateToken);

eventRouter.get('/', getEvents);
eventRouter.get('/:id', getEventById);

// Write operations require liveops_editor or admin
eventRouter.post(
  '/',
  requireRoles('liveops_editor', 'admin'),
  validateSchema(createEventSchema),
  createEvent
);

eventRouter.put(
  '/:id',
  requireRoles('liveops_editor', 'admin'),
  validateSchema(updateEventSchema),
  updateEvent
);

eventRouter.patch(
  '/:id/toggle',
  requireRoles('liveops_editor', 'admin'),
  validateSchema(toggleEventSchema),
  toggleEventStatus
);

eventRouter.delete(
  '/:id',
  requireRoles('liveops_editor', 'admin'),
  deleteEvent
);
