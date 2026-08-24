import { Request, Response, NextFunction } from 'express';
import { IssueTicket } from '../models/IssueTicket';
import { AuditLog } from '../models/AuditLog';
import { z } from 'zod';

export const createIssueSchema = z.object({
  body: z.object({
    ticketKey: z.string().min(3),
    title: z.string().min(3),
    description: z.string().min(5),
    category: z.enum(['quest', 'loot_table', 'combat_balance', 'client_crash', 'shop_billing', 'server_lag', 'ui_glitch']),
    severity: z.enum(['critical_blocker', 'major', 'moderate', 'minor']).default('moderate'),
    status: z.enum(['reported', 'investigating', 'fixed', 'verified', 'closed']).default('reported'),
    affectedEventId: z.string().optional(),
    affectedVersion: z.string().optional(),
    affectedCluster: z.enum(['NA-East', 'EU-Central', 'APAC-East', 'Global', 'Staging-Internal']).optional(),
    reproductionSteps: z.array(z.string()).default([]),
    assignedTo: z.string().optional(),
  }),
});

export const updateIssueSchema = z.object({
  body: createIssueSchema.shape.body.partial().extend({
    resolutionNotes: z.string().optional(),
  }),
});

export const changeStatusSchema = z.object({
  body: z.object({
    status: z.enum(['reported', 'investigating', 'fixed', 'verified', 'closed']),
    note: z.string().optional(),
    resolutionNotes: z.string().optional(),
  }),
});

export const addNoteSchema = z.object({
  body: z.object({
    note: z.string().min(1),
  }),
});

export async function getIssues(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, severity, category, search, affectedCluster } = req.query;
    const filter: Record<string, any> = {};

    if (status) {
      filter.status = { $in: String(status).split(',') };
    }

    if (severity) {
      filter.severity = { $in: String(severity).split(',') };
    }

    if (category) {
      filter.category = { $in: String(category).split(',') };
    }

    if (affectedCluster) {
      filter.affectedCluster = affectedCluster;
    }

    if (search) {
      const searchRegex = new RegExp(String(search), 'i');
      filter.$or = [{ ticketKey: searchRegex }, { title: searchRegex }, { description: searchRegex }];
    }

    const issues = await IssueTicket.find(filter).sort({ createdAt: -1 });

    // Calculate pipeline summary metrics
    const stats = {
      reported: issues.filter((i) => i.status === 'reported').length,
      investigating: issues.filter((i) => i.status === 'investigating').length,
      fixed: issues.filter((i) => i.status === 'fixed').length,
      verified: issues.filter((i) => i.status === 'verified').length,
      closed: issues.filter((i) => i.status === 'closed').length,
      criticalBlockers: issues.filter((i) => i.severity === 'critical_blocker' && i.status !== 'closed').length,
    };

    res.json({
      success: true,
      data: {
        issues,
        stats,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getIssueById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const issue = await IssueTicket.findById(req.params.id);
    if (!issue) {
      res.status(404).json({
        success: false,
        error: { code: 'ERR_ISSUE_NOT_FOUND', message: 'Issue ticket not found.' },
      });
      return;
    }

    res.json({
      success: true,
      data: { issue },
    });
  } catch (err) {
    next(err);
  }
}

export async function createIssue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const existing = await IssueTicket.findOne({ ticketKey: req.body.ticketKey.toUpperCase() });
    if (existing) {
      res.status(409).json({
        success: false,
        error: { code: 'ERR_TICKET_KEY_CONFLICT', message: `Ticket key '${req.body.ticketKey}' already exists.` },
      });
      return;
    }

    const reporter = req.user?.username || 'system';
    const newIssue = await IssueTicket.create({
      ...req.body,
      ticketKey: req.body.ticketKey.toUpperCase(),
      reportedBy: reporter,
      internalNotes: [
        {
          author: reporter,
          authorRole: req.user?.role || 'readonly_viewer',
          note: `Ticket created with initial status '${req.body.status || 'reported'}'`,
          timestamp: new Date().toISOString(),
        },
      ],
    });

    await AuditLog.create({
      action: 'ISSUE_CREATED',
      entityType: 'issue',
      entityId: newIssue._id.toString(),
      performedBy: reporter,
      userRole: req.user?.role || 'readonly_viewer',
      details: `Created issue ticket [${newIssue.ticketKey}] "${newIssue.title}" (${newIssue.severity})`,
    });

    res.status(201).json({
      success: true,
      data: { issue: newIssue },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateIssue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const issue = await IssueTicket.findById(req.params.id);
    if (!issue) {
      res.status(404).json({
        success: false,
        error: { code: 'ERR_ISSUE_NOT_FOUND', message: 'Issue ticket not found.' },
      });
      return;
    }

    Object.assign(issue, req.body);
    await issue.save();

    await AuditLog.create({
      action: 'ISSUE_UPDATED',
      entityType: 'issue',
      entityId: issue._id.toString(),
      performedBy: req.user?.username || 'system',
      userRole: req.user?.role || 'liveops_editor',
      details: `Updated issue ticket [${issue.ticketKey}]`,
    });

    res.json({
      success: true,
      data: { issue },
    });
  } catch (err) {
    next(err);
  }
}

export async function changeIssueStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, note, resolutionNotes } = req.body;
    const issue = await IssueTicket.findById(req.params.id);

    if (!issue) {
      res.status(404).json({
        success: false,
        error: { code: 'ERR_ISSUE_NOT_FOUND', message: 'Issue ticket not found.' },
      });
      return;
    }

    const prevStatus = issue.status;
    issue.status = status;
    if (resolutionNotes !== undefined) {
      issue.resolutionNotes = resolutionNotes;
    }

    const author = req.user?.username || 'system';
    issue.internalNotes.push({
      author,
      authorRole: req.user?.role || 'liveops_editor',
      note: note || `Status transitioned from '${prevStatus}' to '${status}'`,
      timestamp: new Date().toISOString(),
    });

    await issue.save();

    await AuditLog.create({
      action: 'ISSUE_STATUS_TRANSITION',
      entityType: 'issue',
      entityId: issue._id.toString(),
      performedBy: author,
      userRole: req.user?.role || 'liveops_editor',
      details: `Pipeline advance for [${issue.ticketKey}]: ${prevStatus} -> ${status}`,
    });

    res.json({
      success: true,
      data: {
        issue,
        message: `Issue [${issue.ticketKey}] transitioned to '${status}'.`,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function addIssueNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { note } = req.body;
    const issue = await IssueTicket.findById(req.params.id);

    if (!issue) {
      res.status(404).json({
        success: false,
        error: { code: 'ERR_ISSUE_NOT_FOUND', message: 'Issue ticket not found.' },
      });
      return;
    }

    const author = req.user?.username || 'system';
    issue.internalNotes.push({
      author,
      authorRole: req.user?.role || 'readonly_viewer',
      note,
      timestamp: new Date().toISOString(),
    });

    await issue.save();

    res.json({
      success: true,
      data: {
        notes: issue.internalNotes,
      },
    });
  } catch (err) {
    next(err);
  }
}
