import { Router } from 'express';
import {
  getServers,
  createServer,
  updateServer,
  updateServerStatus,
  toggleServerDrain,
  rebootServer,
  deleteServer,
  seedServerFleetPreset,
  createServerSchema,
  updateServerSchema,
  updateStatusSchema,
} from '../controllers/serverController';
import { authenticateToken, requireRoles } from '../middleware/auth';
import { validateSchema } from '../middleware/validate';

export const serverRouter = Router();

// Read-only Fleet Telemetry (All Authenticated Staff)
serverRouter.get('/', authenticateToken, getServers);

// Server Infrastructure Mutations (Root Admin Only)
serverRouter.post('/', authenticateToken, requireRoles('admin'), validateSchema(createServerSchema), createServer);
serverRouter.post('/preset', authenticateToken, requireRoles('admin'), seedServerFleetPreset);
serverRouter.put('/:id', authenticateToken, requireRoles('admin'), validateSchema(updateServerSchema), updateServer);
serverRouter.patch('/:id/status', authenticateToken, requireRoles('admin'), validateSchema(updateStatusSchema), updateServerStatus);
serverRouter.patch('/:id/drain', authenticateToken, requireRoles('admin'), toggleServerDrain);
serverRouter.post('/:id/reboot', authenticateToken, requireRoles('admin'), rebootServer);
serverRouter.delete('/:id', authenticateToken, requireRoles('admin'), deleteServer);
