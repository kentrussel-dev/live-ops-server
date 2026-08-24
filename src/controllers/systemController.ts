import { Request, Response, NextFunction } from 'express';
import { GameEvent } from '../models/GameEvent';
import { PatchNote } from '../models/PatchNote';
import { ShopItemRotation } from '../models/ShopItemRotation';
import { IssueTicket } from '../models/IssueTicket';
import { AuditLog } from '../models/AuditLog';
import { IOperationalStats } from '../../shared/types';

export async function getSystemOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const now = new Date();

    const [
      activeEventsCount,
      upcomingEventsCount,
      activeFlashSalesCount,
      criticalIssuesCount,
      openIssuesCount,
      latestPublishedPatch,
      recentAuditLogs,
    ] = await Promise.all([
      GameEvent.countDocuments({ status: 'active' }),
      GameEvent.countDocuments({ status: 'scheduled' }),
      ShopItemRotation.countDocuments({
        rotationStatus: 'flash_sale',
        'schedule.activeFrom': { $lte: now },
        'schedule.activeUntil': { $gte: now },
      }),
      IssueTicket.countDocuments({
        severity: 'critical_blocker',
        status: { $in: ['reported', 'investigating', 'fixed'] },
      }),
      IssueTicket.countDocuments({
        status: { $in: ['reported', 'investigating', 'fixed'] },
      }),
      PatchNote.findOne({ status: 'published' }).sort({ publishedAt: -1 }),
      AuditLog.find().sort({ createdAt: -1 }).limit(20),
    ]);

    const stats: IOperationalStats = {
      activeEventsCount,
      upcomingEventsCount,
      activeFlashSalesCount,
      criticalIssuesCount,
      openIssuesCount,
      latestPublishedPatch: latestPublishedPatch?.version || 'v2.4.0',
      systemStatus: criticalIssuesCount > 0 ? 'incident_active' : 'nominal',
      connectedClusters: [
        { cluster: 'NA-East', status: 'online', activePlayersEstimate: 142850, latencyMs: 24 },
        { cluster: 'EU-Central', status: 'online', activePlayersEstimate: 189400, latencyMs: 31 },
        { cluster: 'APAC-East', status: 'online', activePlayersEstimate: 312700, latencyMs: 48 },
        { cluster: 'Global', status: 'online', activePlayersEstimate: 644950, latencyMs: 35 },
      ],
    };

    res.json({
      success: true,
      data: {
        stats,
        recentAuditLogs,
        serverTimeUtc: now.toISOString(),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { entityType, limit = '50' } = req.query;
    const filter: Record<string, any> = {};

    if (entityType) {
      filter.entityType = entityType;
    }

    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10)));
    const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(limitNum);

    res.json({
      success: true,
      data: {
        logs,
        total: logs.length,
      },
    });
  } catch (err) {
    next(err);
  }
}
