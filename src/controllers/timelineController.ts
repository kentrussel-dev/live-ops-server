import { Request, Response, NextFunction } from 'express';
import { GameEvent } from '../models/GameEvent';
import { PatchNote } from '../models/PatchNote';
import { ShopItemRotation } from '../models/ShopItemRotation';
import { IssueTicket } from '../models/IssueTicket';
import { ITimelineTrackItem } from '../../shared/types';

export async function getTimelineMatrix(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { from, to, serverCluster } = req.query;

    const startDate = from ? new Date(String(from)) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(String(to)) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const eventQuery: Record<string, any> = {
      $or: [
        { 'schedule.startTime': { $gte: startDate, $lte: endDate } },
        { 'schedule.endTime': { $gte: startDate, $lte: endDate } },
        { 'schedule.startTime': { $lte: startDate }, 'schedule.endTime': { $gte: endDate } },
      ],
    };
    if (serverCluster && serverCluster !== 'Global') {
      eventQuery['targeting.serverClusters'] = { $in: [serverCluster, 'Global'] };
    }

    const [events, patches, shopItems, openIssues] = await Promise.all([
      GameEvent.find(eventQuery),
      PatchNote.find({
        targetPublishTime: { $gte: startDate, $lte: endDate },
      }),
      ShopItemRotation.find({
        $or: [
          { 'schedule.activeFrom': { $gte: startDate, $lte: endDate } },
          { 'schedule.activeUntil': { $gte: startDate, $lte: endDate } },
          { 'schedule.activeFrom': { $lte: startDate }, 'schedule.activeUntil': { $gte: endDate } },
        ],
      }),
      IssueTicket.find({
        status: { $in: ['reported', 'investigating', 'fixed'] },
        severity: { $in: ['critical_blocker', 'major'] },
      }),
    ]);

    const trackItems: ITimelineTrackItem[] = [];

    // Map Events Track
    for (const ev of events) {
      trackItems.push({
        id: ev._id.toString(),
        track: 'event',
        title: ev.name,
        category: ev.category,
        status: ev.status,
        startTime: ev.schedule.startTime.toISOString(),
        endTime: ev.schedule.endTime.toISOString(),
        subtitle: `${ev.targeting.serverClusters.join(', ')} • ${ev.category.toUpperCase()}`,
        metadata: {
          slug: ev.slug,
          segments: ev.targeting.playerSegments,
          expMultiplier: ev.config?.expMultiplier,
        },
      });
    }

    // Map Patches Track (Rendered as deployment windows)
    for (const p of patches) {
      const pubTime = new Date(p.targetPublishTime);
      const windowEnd = new Date(pubTime.getTime() + (p.maintenanceDurationMinutes || 120) * 60 * 1000);
      trackItems.push({
        id: p._id.toString(),
        track: 'patch',
        title: `${p.version} - ${p.title}`,
        category: p.requiresMaintenance ? 'maintenance' : 'hotfix',
        status: p.status,
        startTime: pubTime.toISOString(),
        endTime: windowEnd.toISOString(),
        subtitle: `Build ${p.clientBuildNumber} / ${p.serverBuildNumber} (${p.status.toUpperCase()})`,
        metadata: {
          requiresMaintenance: p.requiresMaintenance,
          durationMinutes: p.maintenanceDurationMinutes,
        },
      });
    }

    // Map Shop Items Track
    for (const item of shopItems) {
      trackItems.push({
        id: item._id.toString(),
        track: 'shop',
        title: `${item.name} (${item.pricing.discountPct > 0 ? `-${item.pricing.discountPct}%` : 'Catalog'})`,
        category: item.category,
        status: item.rotationStatus,
        startTime: item.schedule.activeFrom.toISOString(),
        endTime: item.schedule.activeUntil.toISOString(),
        urgencyOrRarity: item.rarity,
        subtitle: `${item.pricing.salePrice.toLocaleString()} ${item.pricing.currency} [${item.rarity.toUpperCase()}]`,
        metadata: {
          itemId: item.itemId,
          rarity: item.rarity,
          discountPct: item.pricing.discountPct,
        },
      });
    }

    // Map Critical Active Incidents Track
    for (const issue of openIssues) {
      const created = new Date(issue.createdAt);
      // For open issues, span from creation to either now+2d or estimated
      const projectedEnd = new Date(created.getTime() + 48 * 60 * 60 * 1000);
      trackItems.push({
        id: issue._id.toString(),
        track: 'incident',
        title: `[${issue.ticketKey}] ${issue.title}`,
        category: issue.category,
        status: issue.status,
        startTime: created.toISOString(),
        endTime: projectedEnd.toISOString(),
        urgencyOrRarity: issue.severity,
        subtitle: `Sev: ${issue.severity.toUpperCase()} • Status: ${issue.status.toUpperCase()}`,
        metadata: {
          ticketKey: issue.ticketKey,
          severity: issue.severity,
          cluster: issue.affectedCluster,
        },
      });
    }

    res.json({
      success: true,
      data: {
        window: {
          from: startDate.toISOString(),
          to: endDate.toISOString(),
        },
        tracks: {
          events: trackItems.filter((i) => i.track === 'event'),
          patches: trackItems.filter((i) => i.track === 'patch'),
          shop: trackItems.filter((i) => i.track === 'shop'),
          incidents: trackItems.filter((i) => i.track === 'incident'),
        },
        allItems: trackItems,
      },
    });
  } catch (err) {
    next(err);
  }
}
