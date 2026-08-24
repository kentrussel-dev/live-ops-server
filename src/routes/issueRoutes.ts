import { Router } from 'express';
import {
  getIssues,
  getIssueById,
  createIssue,
  updateIssue,
  changeIssueStatus,
  addIssueNote,
  createIssueSchema,
  updateIssueSchema,
  changeStatusSchema,
  addNoteSchema,
} from '../controllers/issueController';
import { authenticateToken, requireRoles } from '../middleware/auth';
import { validateSchema } from '../middleware/validate';

export const issueRouter = Router();

issueRouter.use(authenticateToken);

issueRouter.get('/', getIssues);
issueRouter.get('/:id', getIssueById);

// All authenticated roles (including QA readonly viewers) can report new issues and append investigation notes
issueRouter.post('/', validateSchema(createIssueSchema), createIssue);
issueRouter.post('/:id/notes', validateSchema(addNoteSchema), addIssueNote);

// Status transitions and modifications require liveops_editor or admin
issueRouter.put(
  '/:id',
  requireRoles('liveops_editor', 'admin'),
  validateSchema(updateIssueSchema),
  updateIssue
);

issueRouter.patch(
  '/:id/status',
  requireRoles('liveops_editor', 'admin'),
  validateSchema(changeStatusSchema),
  changeIssueStatus
);
