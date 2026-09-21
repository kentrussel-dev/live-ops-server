import { Router } from 'express';
import {
  getProjects,
  getProjectById,
  createProject,
  updateProjectColumns,
  addProjectCategory,
  deleteProject,
  createProjectSchema,
  updateProjectColumnsSchema,
  addProjectCategorySchema,
} from '../controllers/projectController';
import { authenticateToken, requireRoles } from '../middleware/auth';
import { validateSchema } from '../middleware/validate';

export const projectRouter = Router();

projectRouter.use(authenticateToken);

// List all projects
projectRouter.get('/', getProjects);

// Get single project details with its tickets
projectRouter.get('/:id', getProjectById);

// Create project: open to developer, liveops_editor, readonly_viewer (QA), admin
projectRouter.post(
  '/',
  requireRoles('developer', 'liveops_editor', 'readonly_viewer', 'admin'),
  validateSchema(createProjectSchema),
  createProject
);

// Add / remove / update columns: strictly developer, readonly_viewer (QA), and admin
projectRouter.patch(
  '/:id/columns',
  requireRoles('developer', 'readonly_viewer', 'admin'),
  validateSchema(updateProjectColumnsSchema),
  updateProjectColumns
);

// Add custom category: developer, readonly_viewer (QA), liveops_editor, admin
projectRouter.post(
  '/:id/categories',
  requireRoles('developer', 'readonly_viewer', 'liveops_editor', 'admin'),
  validateSchema(addProjectCategorySchema),
  addProjectCategory
);

// Delete project: admin only
projectRouter.delete(
  '/:id',
  requireRoles('admin'),
  deleteProject
);
