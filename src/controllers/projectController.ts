import { Request, Response, NextFunction } from 'express';
import { Project } from '../models/Project';
import { IssueTicket } from '../models/IssueTicket';
import { AuditLog } from '../models/AuditLog';
import { z } from 'zod';

export const createProjectSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Project name must be at least 2 characters'),
    key: z.string().min(2).max(10, 'Project key must be between 2 and 10 characters'),
    description: z.string().optional(),
    columns: z
      .array(
        z.object({
          id: z.string().min(1),
          name: z.string().min(1),
          order: z.number(),
          color: z.string().optional(),
        })
      )
      .optional(),
  }),
});

export const updateProjectColumnsSchema = z.object({
  body: z.object({
    columns: z.array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        order: z.number(),
        color: z.string().optional(),
      })
    ).min(1, 'Project must have at least one column'),
  }),
});

export async function getProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });

    // Aggregate ticket counts per project
    const projectList = await Promise.all(
      projects.map(async (p) => {
        const ticketCount = await IssueTicket.countDocuments({ projectId: p._id });
        return {
          ...p.toObject(),
          ticketCount,
        };
      })
    );

    res.json({
      success: true,
      data: { projects: projectList },
    });
  } catch (err) {
    next(err);
  }
}

export async function getProjectById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      res.status(404).json({
        success: false,
        error: { code: 'ERR_PROJECT_NOT_FOUND', message: 'Project not found.' },
      });
      return;
    }

    const tickets = await IssueTicket.find({ projectId: project._id }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        project,
        tickets,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function createProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, key, description, columns } = req.body;
    const upperKey = key.toUpperCase();

    const existing = await Project.findOne({ key: upperKey });
    if (existing) {
      res.status(409).json({
        success: false,
        error: { code: 'ERR_PROJECT_KEY_EXISTS', message: `Project key '${upperKey}' already exists.` },
      });
      return;
    }

    const defaultColumns = [
      { id: 'todo', name: 'Todo', order: 0, color: 'text-amber-400' },
      { id: 'doing', name: 'Doing', order: 1, color: 'text-blue-400' },
      { id: 'develop', name: 'Develop', order: 2, color: 'text-indigo-400' },
      { id: 'testing', name: 'Testing', order: 3, color: 'text-purple-400' },
      { id: 'done', name: 'Done', order: 4, color: 'text-emerald-400' },
    ];

    const project = await Project.create({
      name,
      key: upperKey,
      description: description || '',
      columns: columns && columns.length > 0 ? columns : defaultColumns,
      createdBy: req.user?.username || 'system',
    });

    await AuditLog.create({
      action: 'PROJECT_CREATED',
      entityType: 'project',
      entityId: project._id.toString(),
      performedBy: req.user?.username || 'system',
      userRole: req.user?.role || 'admin',
      details: `Created Project [${project.key}] "${project.name}"`,
    });

    res.status(201).json({
      success: true,
      data: { project },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateProjectColumns(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { columns } = req.body;

    const project = await Project.findById(id);
    if (!project) {
      res.status(404).json({
        success: false,
        error: { code: 'ERR_PROJECT_NOT_FOUND', message: 'Project not found.' },
      });
      return;
    }

    project.columns = columns;
    await project.save();

    await AuditLog.create({
      action: 'PROJECT_COLUMNS_UPDATED',
      entityType: 'project',
      entityId: project._id.toString(),
      performedBy: req.user?.username || 'system',
      userRole: req.user?.role || 'developer',
      details: `Updated Kanban columns for project [${project.key}]`,
    });

    res.json({
      success: true,
      data: { project },
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteProject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const project = await Project.findByIdAndDelete(id);

    if (!project) {
      res.status(404).json({
        success: false,
        error: { code: 'ERR_PROJECT_NOT_FOUND', message: 'Project not found.' },
      });
      return;
    }

    // Delete related tickets
    await IssueTicket.deleteMany({ projectId: id });

    await AuditLog.create({
      action: 'PROJECT_DELETED',
      entityType: 'project',
      entityId: id,
      performedBy: req.user?.username || 'admin',
      userRole: req.user?.role || 'admin',
      details: `Deleted project [${project.key}] "${project.name}" and associated tickets.`,
    });

    res.json({
      success: true,
      data: { message: `Project ${project.key} and its tickets deleted.` },
    });
  } catch (err) {
    next(err);
  }
}
