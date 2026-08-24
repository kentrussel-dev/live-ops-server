import { Router } from 'express';
import {
  getPatches,
  getPatchById,
  createPatch,
  updatePatch,
  publishPatch,
  comparePatchDiff,
  createPatchSchema,
  updatePatchSchema,
} from '../controllers/patchController';
import { authenticateToken, requireRoles } from '../middleware/auth';
import { validateSchema } from '../middleware/validate';

export const patchRouter = Router();

patchRouter.use(authenticateToken);

patchRouter.get('/', getPatches);
patchRouter.get('/:id', getPatchById);
patchRouter.get('/:currentId/diff/:previousId', comparePatchDiff);

patchRouter.post(
  '/',
  requireRoles('liveops_editor', 'admin'),
  validateSchema(createPatchSchema),
  createPatch
);

patchRouter.put(
  '/:id',
  requireRoles('liveops_editor', 'admin'),
  validateSchema(updatePatchSchema),
  updatePatch
);

patchRouter.post(
  '/:id/publish',
  requireRoles('liveops_editor', 'admin'),
  publishPatch
);
