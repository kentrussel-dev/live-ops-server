import { Request, Response, NextFunction } from 'express';
import { GameServer } from '../models/GameServer';
import { AuditLog } from '../models/AuditLog';
import { z } from 'zod';

export const createServerSchema = z.object({
  body: z.object({
    serverId: z.string().min(3),
    name: z.string().min(3),
    host: z.string().min(5),
    region: z.enum(['US-East', 'US-West', 'EU-Central', 'EU-West', 'AP-East', 'AP-South', 'SA-East']),
    maxPlayers: z.number().min(100).default(5000),
    tickRateHz: z.number().min(0).max(128).default(60.0),
    pingMs: z.number().min(0).default(20),
  }),
});

export const updateServerSchema = z.object({
  body: z.object({
    serverId: z.string().min(3).optional(),
    name: z.string().min(3).optional(),
    host: z.string().min(5).optional(),
    region: z.enum(['US-East', 'US-West', 'EU-Central', 'EU-West', 'AP-East', 'AP-South', 'SA-East']).optional(),
    status: z.enum(['online', 'high_load', 'draining', 'maintenance', 'offline']).optional(),
    currentPlayers: z.number().min(0).optional(),
    maxPlayers: z.number().min(100).optional(),
    pingMs: z.number().min(0).optional(),
    tickRateHz: z.number().min(0).max(128).optional(),
    cpuUsagePct: z.number().min(0).max(100).optional(),
    memoryUsagePct: z.number().min(0).max(100).optional(),
    bandwidthMbps: z.number().min(0).optional(),
    lockedForLogins: z.boolean().optional(),
  }),
});

export const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum(['online', 'high_load', 'draining', 'maintenance', 'offline']),
  }),
});

export async function getServers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const servers = await GameServer.find().sort({ region: 1, serverId: 1 });

    const totalCcu = servers.reduce((acc, s) => acc + (s.status !== 'offline' && s.status !== 'maintenance' ? s.currentPlayers : 0), 0);
    const totalCapacity = servers.reduce((acc, s) => acc + s.maxPlayers, 0);
    const onlineServers = servers.filter((s) => s.status === 'online' || s.status === 'high_load').length;
    const activeServers = servers.filter((s) => s.status !== 'offline' && s.status !== 'maintenance');
    const avgPingMs = activeServers.length > 0
      ? Math.round(activeServers.reduce((acc, s) => acc + s.pingMs, 0) / activeServers.length)
      : 0;
    const avgTickRateHz = activeServers.length > 0
      ? parseFloat((activeServers.reduce((acc, s) => acc + s.tickRateHz, 0) / activeServers.length).toFixed(1))
      : 60.0;

    res.json({
      success: true,
      data: {
        servers,
        fleetSummary: {
          totalServers: servers.length,
          onlineServers,
          totalCcu,
          totalCapacity,
          utilizationPct: totalCapacity > 0 ? parseFloat(((totalCcu / totalCapacity) * 100).toFixed(1)) : 0,
          avgPingMs,
          avgTickRateHz,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function createServer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const serverData = req.body;
    const existing = await GameServer.findOne({ serverId: serverData.serverId });
    if (existing) {
      res.status(409).json({
        success: false,
        error: { code: 'ERR_SERVER_EXISTS', message: 'A server node with this Server ID already exists in the fleet.' },
      });
      return;
    }

    const server = await GameServer.create(serverData);

    await AuditLog.create({
      action: 'SERVER_NODE_PROVISIONED',
      entityType: 'server',
      entityId: server._id.toString(),
      performedBy: req.user?.username || 'Admin',
      userRole: req.user?.role || 'admin',
      details: `Provisioned game server: ${server.name} (${server.serverId}, Host: ${server.host}, Region: ${server.region}, Capacity: ${server.maxPlayers}).`,
      ipAddress: req.ip,
    });

    res.status(201).json({ success: true, data: { server } });
  } catch (err) {
    next(err);
  }
}

export async function updateServer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const updates = req.body;

    const server = await GameServer.findById(id);
    if (!server) {
      res.status(404).json({
        success: false,
        error: { code: 'ERR_SERVER_NOT_FOUND', message: 'Game server node not found.' },
      });
      return;
    }

    // If changing serverId, verify uniqueness
    if (updates.serverId && updates.serverId !== server.serverId) {
      const existing = await GameServer.findOne({ serverId: updates.serverId });
      if (existing) {
        res.status(409).json({
          success: false,
          error: { code: 'ERR_SERVER_EXISTS', message: 'Another server node with this Server ID already exists.' },
        });
        return;
      }
    }

    Object.assign(server, updates);
    await server.save();

    await AuditLog.create({
      action: 'SERVER_MANUALLY_EDITED',
      entityType: 'server',
      entityId: server._id.toString(),
      performedBy: req.user?.username || 'Admin',
      userRole: req.user?.role || 'admin',
      details: `Manually updated configuration & telemetry for server: ${server.name} (${server.serverId}).`,
      ipAddress: req.ip,
    });

    res.json({ success: true, data: { server } });
  } catch (err) {
    next(err);
  }
}

export async function updateServerStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const server = await GameServer.findById(id);
    if (!server) {
      res.status(404).json({
        success: false,
        error: { code: 'ERR_SERVER_NOT_FOUND', message: 'Game server node not found.' },
      });
      return;
    }

    const oldStatus = server.status;
    server.status = status;
    if (status === 'offline' || status === 'maintenance') {
      server.currentPlayers = 0;
      server.lockedForLogins = true;
    } else if (status === 'online') {
      server.lockedForLogins = false;
    }
    await server.save();

    await AuditLog.create({
      action: 'SERVER_STATUS_MUTATED',
      entityType: 'server',
      entityId: server._id.toString(),
      performedBy: req.user?.username || 'Admin',
      userRole: req.user?.role || 'admin',
      details: `Mutated server ${server.name} status from '${oldStatus}' to '${status}'.`,
      ipAddress: req.ip,
    });

    res.json({ success: true, data: { server } });
  } catch (err) {
    next(err);
  }
}

export async function toggleServerDrain(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const server = await GameServer.findById(id);
    if (!server) {
      res.status(404).json({
        success: false,
        error: { code: 'ERR_SERVER_NOT_FOUND', message: 'Game server node not found.' },
      });
      return;
    }

    if (server.status === 'draining') {
      server.status = 'online';
      server.lockedForLogins = false;
    } else {
      server.status = 'draining';
      server.lockedForLogins = true;
    }
    await server.save();

    await AuditLog.create({
      action: 'SERVER_DRAIN_TOGGLED',
      entityType: 'server',
      entityId: server._id.toString(),
      performedBy: req.user?.username || 'Admin',
      userRole: req.user?.role || 'admin',
      details: `Server ${server.name} traffic draining set to: ${server.status === 'draining' ? 'ACTIVE (Rejecting Logins)' : 'NORMAL'}.`,
      ipAddress: req.ip,
    });

    res.json({ success: true, data: { server } });
  } catch (err) {
    next(err);
  }
}

export async function rebootServer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const server = await GameServer.findById(id);
    if (!server) {
      res.status(404).json({
        success: false,
        error: { code: 'ERR_SERVER_NOT_FOUND', message: 'Game server node not found.' },
      });
      return;
    }

    server.status = 'online';
    server.currentPlayers = 0;
    server.uptimeSeconds = 0;
    server.lockedForLogins = false;
    server.lastHeartbeat = new Date();
    await server.save();

    await AuditLog.create({
      action: 'SERVER_REBOOT_INITIATED',
      entityType: 'server',
      entityId: server._id.toString(),
      performedBy: req.user?.username || 'Admin',
      userRole: req.user?.role || 'admin',
      details: `Reboot command executed for game server: ${server.name} (${server.host}).`,
      ipAddress: req.ip,
    });

    res.json({ success: true, data: { server, message: `Server ${server.name} rebooted successfully.` } });
  } catch (err) {
    next(err);
  }
}

export async function deleteServer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const server = await GameServer.findByIdAndDelete(id);
    if (!server) {
      res.status(404).json({
        success: false,
        error: { code: 'ERR_SERVER_NOT_FOUND', message: 'Game server node not found.' },
      });
      return;
    }

    await AuditLog.create({
      action: 'SERVER_DECOMMISSIONED',
      entityType: 'server',
      entityId: id,
      performedBy: req.user?.username || 'Admin',
      userRole: req.user?.role || 'admin',
      details: `Decommissioned game server: ${server.name} (${server.serverId}, Host: ${server.host}).`,
      ipAddress: req.ip,
    });

    res.json({ success: true, data: { message: `Game server ${server.name} decommissioned from fleet.` } });
  } catch (err) {
    next(err);
  }
}

export async function seedServerFleetPreset(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Clear only the GameServer collection
    await GameServer.deleteMany({});

    const presetServers = [
      {
        serverId: 'srv-useast-01',
        name: 'US-East Dedicated Server 01',
        host: '198.51.100.24:7777',
        region: 'US-East',
        status: 'high_load',
        currentPlayers: 4820,
        maxPlayers: 5000,
        pingMs: 18,
        tickRateHz: 59.9,
        cpuUsagePct: 84.5,
        memoryUsagePct: 78.2,
        bandwidthMbps: 580,
        lockedForLogins: false,
        uptimeSeconds: 86400 * 12,
      },
      {
        serverId: 'srv-useast-02',
        name: 'US-East Dedicated Server 02',
        host: '198.51.100.25:7777',
        region: 'US-East',
        status: 'online',
        currentPlayers: 3200,
        maxPlayers: 5000,
        pingMs: 21,
        tickRateHz: 60.0,
        cpuUsagePct: 52.0,
        memoryUsagePct: 56.4,
        bandwidthMbps: 410,
        lockedForLogins: false,
        uptimeSeconds: 86400 * 14,
      },
      {
        serverId: 'srv-uswest-01',
        name: 'US-West Dedicated Server 01',
        host: '198.51.100.88:7777',
        region: 'US-West',
        status: 'online',
        currentPlayers: 2850,
        maxPlayers: 4000,
        pingMs: 34,
        tickRateHz: 60.0,
        cpuUsagePct: 48.2,
        memoryUsagePct: 51.0,
        bandwidthMbps: 350,
        lockedForLogins: false,
        uptimeSeconds: 86400 * 9,
      },
      {
        serverId: 'srv-eucentral-01',
        name: 'EU-Central Dedicated Server 01',
        host: '185.199.108.12:7777',
        region: 'EU-Central',
        status: 'online',
        currentPlayers: 4400,
        maxPlayers: 5000,
        pingMs: 28,
        tickRateHz: 59.8,
        cpuUsagePct: 76.4,
        memoryUsagePct: 72.1,
        bandwidthMbps: 520,
        lockedForLogins: false,
        uptimeSeconds: 86400 * 18,
      },
      {
        serverId: 'srv-euwest-02',
        name: 'EU-West Staging & Maint Node',
        host: '185.199.109.45:7777',
        region: 'EU-West',
        status: 'maintenance',
        currentPlayers: 0,
        maxPlayers: 4000,
        pingMs: 0,
        tickRateHz: 0.0,
        cpuUsagePct: 2.5,
        memoryUsagePct: 11.2,
        bandwidthMbps: 0,
        lockedForLogins: true,
        uptimeSeconds: 1200,
      },
      {
        serverId: 'srv-apeast-01',
        name: 'AP-East Dedicated Server 01',
        host: '203.0.113.50:7777',
        region: 'AP-East',
        status: 'online',
        currentPlayers: 5100,
        maxPlayers: 6000,
        pingMs: 44,
        tickRateHz: 59.7,
        cpuUsagePct: 81.0,
        memoryUsagePct: 77.8,
        bandwidthMbps: 610,
        lockedForLogins: false,
        uptimeSeconds: 86400 * 7,
      },
      {
        serverId: 'srv-apsouth-01',
        name: 'AP-South Dedicated Edge 01',
        host: '203.0.113.88:7777',
        region: 'AP-South',
        status: 'online',
        currentPlayers: 1950,
        maxPlayers: 3500,
        pingMs: 58,
        tickRateHz: 60.0,
        cpuUsagePct: 41.5,
        memoryUsagePct: 44.0,
        bandwidthMbps: 290,
        lockedForLogins: false,
        uptimeSeconds: 86400 * 5,
      },
      {
        serverId: 'srv-saeast-01',
        name: 'SA-East Dedicated Server 01',
        host: '177.185.200.10:7777',
        region: 'SA-East',
        status: 'online',
        currentPlayers: 2100,
        maxPlayers: 4000,
        pingMs: 65,
        tickRateHz: 60.0,
        cpuUsagePct: 46.0,
        memoryUsagePct: 49.5,
        bandwidthMbps: 310,
        lockedForLogins: false,
        uptimeSeconds: 86400 * 11,
      },
    ];

    const createdServers = await GameServer.create(presetServers);

    await AuditLog.create({
      action: 'SERVER_FLEET_PRESET_POPULATED',
      entityType: 'server',
      performedBy: req.user?.username || 'Admin',
      userRole: req.user?.role || 'admin',
      details: `Generated complete realistic Game Server Fleet preset (${createdServers.length} production dedicated nodes).`,
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      data: {
        message: `Successfully populated fleet with ${createdServers.length} game servers.`,
        count: createdServers.length,
      },
    });
  } catch (err) {
    next(err);
  }
}
