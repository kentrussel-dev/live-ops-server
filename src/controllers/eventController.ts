import { Request, Response, NextFunction } from 'express';
import { GameEvent } from '../models/GameEvent';
import { AuditLog } from '../models/AuditLog';
import { z } from 'zod';

export const createEventSchema = z.object({
  body: z.object({
    name: z.string().min(3).max(120),
    slug: z.string().min(3).max(120),
    description: z.string().min(5),
    category: z.enum(['raid', 'exp_boost', 'community', 'login_reward', 'pvp_season', 'world_boss', 'maintenance']),
    status: z.enum(['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled']).default('draft'),
    schedule: z.object({
      startTime: z.string().datetime(),
      endTime: z.string().datetime(),
      timezone: z.string().default('UTC'),
      recurrence: z.enum(['none', 'daily', 'weekly', 'monthly']).default('none'),
    }),
    targeting: z.object({
      playerSegments: z.array(z.enum(['all', 'new_players', 'veterans_level_80_plus', 'vip_tier_3', 'guild_leaders', 'dormant_returnees'])).default(['all']),
      serverClusters: z.array(z.enum(['NA-East', 'EU-Central', 'APAC-East', 'Global', 'Staging-Internal'])).default(['Global']),
      minLevel: z.number().min(1).max(100).optional(),
      maxLevel: z.number().min(1).max(100).optional(),
    }),
    config: z.object({
      expMultiplier: z.number().min(1).max(10).optional(),
      dropRateBonusPct: z.number().min(0).max(500).optional(),
      goldBonusPct: z.number().min(0).max(500).optional(),
      specialRules: z.array(z.string()).optional(),
      bannerAssetUrl: z.string().optional(),
    }).optional(),
  }),
});

export const updateEventSchema = z.object({
  body: createEventSchema.shape.body.partial(),
});

export const toggleEventSchema = z.object({
  body: z.object({
    status: z.enum(['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled']),
    reason: z.string().optional(),
  }),
});

export async function getEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, category, serverCluster, playerSegment, search, from, to, page = '1', limit = '50' } = req.query;

    const filter: Record<string, any> = {};

    if (status) {
      const statuses = String(status).split(',');
      filter.status = { $in: statuses };
    }

    if (category) {
      const categories = String(category).split(',');
      filter.category = { $in: categories };
    }

    if (serverCluster) {
      filter['targeting.serverClusters'] = serverCluster;
    }

    if (playerSegment) {
      filter['targeting.playerSegments'] = playerSegment;
    }

    if (search) {
      const searchRegex = new RegExp(String(search), 'i');
      filter.$or = [{ name: searchRegex }, { slug: searchRegex }, { description: searchRegex }];
    }

    if (from || to) {
      filter['schedule.startTime'] = {};
      if (from) filter['schedule.startTime'].$gte = new Date(String(from));
      if (to) filter['schedule.startTime'].$lte = new Date(String(to));
    }

    const pageNum = Math.max(1, parseInt(String(page), 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10)));
    const skip = (pageNum - 1) * limitNum;

    const [events, total] = await Promise.all([
      GameEvent.find(filter).sort({ 'schedule.startTime': -1 }).skip(skip).limit(limitNum),
      GameEvent.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        events,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getEventById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const event = await GameEvent.findById(req.params.id);
    if (!event) {
      res.status(404).json({
        success: false,
        error: { code: 'ERR_EVENT_NOT_FOUND', message: 'Game event not found.' },
      });
      return;
    }

    res.json({
      success: true,
      data: { event },
    });
  } catch (err) {
    next(err);
  }
}

export async function createEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const start = new Date(req.body.schedule.startTime);
    const end = new Date(req.body.schedule.endTime);

    if (end <= start) {
      res.status(400).json({
        success: false,
        error: {
          code: 'ERR_INVALID_SCHEDULE',
          message: 'Schedule endTime must be strictly after startTime.',
        },
      });
      return;
    }

    const existing = await GameEvent.findOne({ slug: req.body.slug.toLowerCase() });
    if (existing) {
      res.status(409).json({
        success: false,
        error: {
          code: 'ERR_SLUG_CONFLICT',
          message: `An event with slug '${req.body.slug}' already exists.`,
        },
      });
      return;
    }

    const username = req.user?.username || 'system';

    const newEvent = await GameEvent.create({
      ...req.body,
      slug: req.body.slug.toLowerCase(),
      audit: {
        createdBy: username,
        lastModifiedBy: username,
        version: 1,
      },
    });

    await AuditLog.create({
      action: 'EVENT_CREATED',
      entityType: 'event',
      entityId: newEvent._id.toString(),
      performedBy: username,
      userRole: req.user?.role || 'liveops_editor',
      details: `Created event '${newEvent.name}' (${newEvent.slug}) with status ${newEvent.status}`,
      diffPayload: req.body,
    });

    res.status(201).json({
      success: true,
      data: { event: newEvent },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const event = await GameEvent.findById(req.params.id);
    if (!event) {
      res.status(404).json({
        success: false,
        error: { code: 'ERR_EVENT_NOT_FOUND', message: 'Game event not found.' },
      });
      return;
    }

    if (req.body.schedule) {
      const start = req.body.schedule.startTime ? new Date(req.body.schedule.startTime) : event.schedule.startTime;
      const end = req.body.schedule.endTime ? new Date(req.body.schedule.endTime) : event.schedule.endTime;
      if (end <= start) {
        res.status(400).json({
          success: false,
          error: { code: 'ERR_INVALID_SCHEDULE', message: 'Schedule endTime must be strictly after startTime.' },
        });
        return;
      }
    }

    const username = req.user?.username || 'system';
    const oldPayload = event.toObject();

    Object.assign(event, req.body);
    event.audit.lastModifiedBy = username;
    event.audit.version += 1;

    await event.save();

    await AuditLog.create({
      action: 'EVENT_UPDATED',
      entityType: 'event',
      entityId: event._id.toString(),
      performedBy: username,
      userRole: req.user?.role || 'liveops_editor',
      details: `Updated event '${event.name}' to version ${event.audit.version}`,
      diffPayload: { before: oldPayload, after: req.body },
    });

    res.json({
      success: true,
      data: { event },
    });
  } catch (err) {
    next(err);
  }
}

export async function toggleEventStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, reason } = req.body;
    const event = await GameEvent.findById(req.params.id);

    if (!event) {
      res.status(404).json({
        success: false,
        error: { code: 'ERR_EVENT_NOT_FOUND', message: 'Game event not found.' },
      });
      return;
    }

    const prevStatus = event.status;
    event.status = status;
    event.audit.lastModifiedBy = req.user?.username || 'system';
    event.audit.version += 1;
    await event.save();

    await AuditLog.create({
      action: 'EVENT_STATUS_TOGGLED',
      entityType: 'event',
      entityId: event._id.toString(),
      performedBy: req.user?.username || 'system',
      userRole: req.user?.role || 'liveops_editor',
      details: `Fast-toggled event '${event.name}' from ${prevStatus} to ${status}. Reason: ${reason || 'Manual live-ops intervention'}`,
      diffPayload: { previousStatus: prevStatus, newStatus: status, reason },
    });

    res.json({
      success: true,
      data: {
        event,
        message: `Event '${event.name}' status successfully changed from ${prevStatus} to ${status}.`,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const event = await GameEvent.findByIdAndDelete(req.params.id);
    if (!event) {
      res.status(404).json({
        success: false,
        error: { code: 'ERR_EVENT_NOT_FOUND', message: 'Game event not found.' },
      });
      return;
    }

    await AuditLog.create({
      action: 'EVENT_DELETED',
      entityType: 'event',
      entityId: req.params.id,
      performedBy: req.user?.username || 'system',
      userRole: req.user?.role || 'admin',
      details: `Permanently deleted event '${event.name}' (${event.slug})`,
    });

    res.json({
      success: true,
      message: `Event '${event.name}' deleted successfully.`,
    });
  } catch (err) {
    next(err);
  }
}
