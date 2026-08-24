import { Request, Response, NextFunction } from 'express';
import { IssueTicket } from '../models/IssueTicket';
import { AuditLog } from '../models/AuditLog';
import { User } from '../models/User';
import { sendNotificationToUser } from '../socket';
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

export const assignIssueSchema = z.object({
  body: z.object({
    assignedTo: z.string().min(1, 'Assignee is required'),
    note: z.string().optional(),
  }),
});

export const addNoteSchema = z.object({
  body: z.object({
    note: z.string().min(1),
  }),
});

export async function getIssues(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, severity, category, search, affectedCluster, assignedTo } = req.query;
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

    if (assignedTo) {
      filter.assignedTo = assignedTo;
    }

    if (search) {
      const searchRegex = new RegExp(String(search), 'i');
      filter.$or = [{ ticketKey: searchRegex }, { title: searchRegex }, { description: searchRegex }];
    }

    const issues = await IssueTicket.find(filter).sort({ createdAt: -1 });

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

    // If assigned on creation, dispatch notification
    if (newIssue.assignedTo) {
      const targetUser = await User.findOne({
        $or: [{ username: newIssue.assignedTo }, { email: newIssue.assignedTo }],
      });
      if (targetUser) {
        await sendNotificationToUser({
          recipientId: targetUser._id.toString(),
          sender: { _id: req.user?.userId || '', username: reporter },
          type: 'ticket_assigned',
          title: `You were assigned to [${newIssue.ticketKey}] ${newIssue.title}`,
          message: `Subject: You have been assigned to ${newIssue.title}.\nReported by ${reporter}.`,
          entityType: 'issue',
          entityId: newIssue._id.toString(),
        });
      }
    }

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

    const prevAssigned = issue.assignedTo;
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

    // Notify if assignee changed
    if (issue.assignedTo && issue.assignedTo !== prevAssigned) {
      const targetUser = await User.findOne({
        $or: [{ username: issue.assignedTo }, { email: issue.assignedTo }],
      });
      if (targetUser) {
        await sendNotificationToUser({
          recipientId: targetUser._id.toString(),
          sender: { _id: req.user?.userId || '', username: req.user?.username || 'system' },
          type: 'ticket_assigned',
          title: `You were assigned to [${issue.ticketKey}] ${issue.title}`,
          message: `Subject: You have been assigned to the Task [${issue.ticketKey}] ${issue.title}. Assigned by ${req.user?.username}.`,
          entityType: 'issue',
          entityId: issue._id.toString(),
        });
      }
    }

    res.json({
      success: true,
      data: { issue },
    });
  } catch (err) {
    next(err);
  }
}

export async function assignIssue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { assignedTo, note } = req.body;
    const issue = await IssueTicket.findById(req.params.id);
    if (!issue) {
      res.status(404).json({ success: false, error: { message: 'Issue ticket not found.' } });
      return;
    }

    const prevAssigned = issue.assignedTo;
    issue.assignedTo = assignedTo;

    const author = req.user?.username || 'system';
    issue.internalNotes.push({
      author,
      authorRole: req.user?.role || 'liveops_editor',
      note: note || `Assigned to @${assignedTo} (was: ${prevAssigned || 'unassigned'})`,
      timestamp: new Date().toISOString(),
    });

    await issue.save();

    await AuditLog.create({
      action: 'ISSUE_ASSIGNED',
      entityType: 'issue',
      entityId: issue._id.toString(),
      performedBy: author,
      userRole: req.user?.role || 'liveops_editor',
      details: `Assigned ticket [${issue.ticketKey}] to @${assignedTo}`,
    });

    const targetUser = await User.findOne({
      $or: [{ username: assignedTo }, { email: assignedTo }],
    });

    if (targetUser) {
      await sendNotificationToUser({
        recipientId: targetUser._id.toString(),
        sender: { _id: req.user?.userId || '', username: author },
        type: 'ticket_assigned',
        title: `You have been assigned to [${issue.ticketKey}] ${issue.title}`,
        message: `Subject: You have been assigned to [${issue.ticketKey}] ${issue.title}\nAssigned by ${author}.\n${note || ''}`,
        entityType: 'issue',
        entityId: issue._id.toString(),
      });
    }

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
      details: `Status of ticket [${issue.ticketKey}] changed from '${prevStatus}' to '${status}'`,
    });

    // If ticket is assigned to someone else, notify them of status transition
    if (issue.assignedTo && issue.assignedTo !== author) {
      const targetUser = await User.findOne({
        $or: [{ username: issue.assignedTo }, { email: issue.assignedTo }],
      });
      if (targetUser) {
        await sendNotificationToUser({
          recipientId: targetUser._id.toString(),
          sender: { _id: req.user?.userId || '', username: author },
          type: 'status_change',
          title: `Ticket [${issue.ticketKey}] moved to ${status.toUpperCase()}`,
          message: `Ticket "${issue.title}" stage updated from ${prevStatus} -> ${status} by ${author}.`,
          entityType: 'issue',
          entityId: issue._id.toString(),
        });
      }
    }

    res.json({
      success: true,
      data: { issue },
    });
  } catch (err) {
    next(err);
  }
}

export async function addInternalNote(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      authorRole: req.user?.role || 'liveops_editor',
      note,
      timestamp: new Date().toISOString(),
    });

    await issue.save();

    await AuditLog.create({
      action: 'ISSUE_NOTE_ADDED',
      entityType: 'issue',
      entityId: issue._id.toString(),
      performedBy: author,
      userRole: req.user?.role || 'liveops_editor',
      details: `Added note to issue ticket [${issue.ticketKey}]`,
    });

    res.json({
      success: true,
      data: { issue },
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteIssue(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const issue = await IssueTicket.findByIdAndDelete(req.params.id);
    if (!issue) {
      res.status(404).json({
        success: false,
        error: { code: 'ERR_ISSUE_NOT_FOUND', message: 'Issue ticket not found.' },
      });
      return;
    }

    await AuditLog.create({
      action: 'ISSUE_DELETED',
      entityType: 'issue',
      entityId: req.params.id,
      performedBy: req.user?.username || 'admin',
      userRole: req.user?.role || 'admin',
      details: `Deleted issue ticket [${issue.ticketKey}] "${issue.title}"`,
    });

    res.json({
      success: true,
      data: { message: `Issue ticket ${issue.ticketKey} permanently removed.` },
    });
  } catch (err) {
    next(err);
  }
}
