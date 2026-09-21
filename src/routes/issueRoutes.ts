import { Router } from 'express';
import {
  getIssues,
  getIssueById,
  createIssue,
  updateIssue,
  assignIssue,
  changeIssueStatus,
  addInternalNote,
  deleteIssue,
  createIssueSchema,
  updateIssueSchema,
  assignIssueSchema,
  changeStatusSchema,
  addNoteSchema,
} from '../controllers/issueController';
import { authenticateToken, requireRoles } from '../middleware/auth';
import { validateSchema } from '../middleware/validate';

export const issueRouter = Router();

issueRouter.use(authenticateToken);

issueRouter.get('/', getIssues);
issueRouter.get('/:id', getIssueById);

// All authenticated roles can report new issues and append investigation notes
issueRouter.post('/', validateSchema(createIssueSchema), createIssue);
issueRouter.post('/:id/notes', validateSchema(addNoteSchema), addInternalNote);

// Assignment, Status transitions and modifications require developer, liveops_editor, readonly_viewer, or admin
issueRouter.post(
  '/:id/assign',
  requireRoles('developer', 'liveops_editor', 'readonly_viewer', 'admin'),
  validateSchema(assignIssueSchema),
  assignIssue
);

issueRouter.put(
  '/:id',
  requireRoles('developer', 'liveops_editor', 'readonly_viewer', 'admin'),
  validateSchema(updateIssueSchema),
  updateIssue
);

issueRouter.patch(
  '/:id/status',
  requireRoles('developer', 'liveops_editor', 'readonly_viewer', 'admin'),
  validateSchema(changeStatusSchema),
  changeIssueStatus
);

issueRouter.delete(
  '/:id',
  requireRoles('admin'),
  deleteIssue
);
