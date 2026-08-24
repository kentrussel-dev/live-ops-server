import { Request, Response, NextFunction } from 'express';
import { GameServer } from '../models/GameServer';
import { GameEvent } from '../models/GameEvent';
import { PatchNote } from '../models/PatchNote';
import { ShopItemRotation } from '../models/ShopItemRotation';
import { IssueTicket } from '../models/IssueTicket';
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
    const { region, status } = req.query;
    const filter: any = {};
    if (region && region !== 'all') filter.region = region;
    if (status && status !== 'all') filter.status = status;

    const servers = await GameServer.find(filter).sort({ region: 1, name: 1 });

    const totalCapacity = servers.reduce((acc, s) => acc + s.maxPlayers, 0);
    const totalCcu = servers.reduce((acc, s) => acc + s.currentPlayers, 0);
    const onlineServers = servers.filter((s) => s.status === 'online' || s.status === 'high_load').length;
    const totalServers = servers.length;
    const avgPingMs = totalServers > 0 ? Math.round(servers.reduce((acc, s) => acc + s.pingMs, 0) / totalServers) : 0;
    const avgTickRateHz = totalServers > 0 ? Math.round((servers.reduce((acc, s) => acc + s.tickRateHz, 0) / totalServers) * 10) / 10 : 0;

    const fleetSummary = {
      totalServers,
      onlineServers,
      totalCcu,
      totalCapacity,
      utilizationPct: totalCapacity > 0 ? Math.round((totalCcu / totalCapacity) * 100) : 0,
      avgPingMs,
      avgTickRateHz,
    };

    res.json({
      success: true,
      data: {
        servers,
        summary: fleetSummary,
        fleetSummary,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function createServer(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { serverId, name, host, region, maxPlayers, tickRateHz, pingMs } = req.body;

    const existing = await GameServer.findOne({ $or: [{ serverId }, { host }] });
    if (existing) {
      res.status(409).json({
        success: false,
        error: { code: 'ERR_SERVER_CONFLICT', message: 'A server node with this Server ID or host already exists.' },
      });
      return;
    }

    const server = await GameServer.create({
      serverId,
      name,
      host,
      region,
      maxPlayers: maxPlayers || 5000,
      currentPlayers: 0,
      status: 'online',
      tickRateHz: tickRateHz || 60.0,
      pingMs: pingMs || 20,
      cpuUsagePct: Math.floor(Math.random() * 20) + 15,
      memoryUsagePct: Math.floor(Math.random() * 20) + 25,
      bandwidthMbps: 50,
      lockedForLogins: false,
      uptimeSeconds: 0,
      lastHeartbeat: new Date(),
    });

    await AuditLog.create({
      action: 'SERVER_PROVISIONED',
      entityType: 'server',
      entityId: server._id.toString(),
      performedBy: req.user?.username || 'Admin',
      userRole: req.user?.role || 'admin',
      details: `Provisioned dedicated game server: ${server.name} (${server.serverId}, Host: ${server.host}, Region: ${server.region}).`,
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

    const server = await GameServer.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!server) {
      res.status(404).json({
        success: false,
        error: { code: 'ERR_SERVER_NOT_FOUND', message: 'Game server node not found.' },
      });
      return;
    }

    await AuditLog.create({
      action: 'SERVER_CONFIG_UPDATED',
      entityType: 'server',
      entityId: server._id.toString(),
      performedBy: req.user?.username || 'Admin',
      userRole: req.user?.role || 'admin',
      details: `Updated parameters for server ${server.name} (${server.serverId}).`,
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
    if (status === 'maintenance' || status === 'offline' || status === 'draining') {
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

export async function clearServerFleet(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await GameServer.deleteMany({});

    await AuditLog.create({
      action: 'SERVER_FLEET_CLEARED',
      entityType: 'server',
      performedBy: req.user?.username || 'Admin',
      userRole: req.user?.role || 'admin',
      details: `Decommissioned and cleared all ${result.deletedCount} game servers from the fleet.`,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      data: {
        message: `Successfully cleared all ${result.deletedCount} game server nodes.`,
        deletedCount: result.deletedCount,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function seedServerFleetPreset(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
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

export async function seedContentPreset(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;

    // Clear existing content collections
    await Promise.all([
      GameEvent.deleteMany({}),
      PatchNote.deleteMany({}),
      ShopItemRotation.deleteMany({}),
      IssueTicket.deleteMany({}),
    ]);

    // 1. Seed Game Events
    const events = await GameEvent.create([
      {
        name: 'Void Leviathan World Boss Incursion',
        slug: 'void-leviathan-incursion',
        description: 'Server-wide cooperative raid battle in the Abyssal Rift. Slaying the Leviathan unlocks 2.5x Mythic loot drops.',
        category: 'world_boss',
        status: 'active',
        schedule: {
          startTime: new Date(now.getTime() - 2 * dayMs),
          endTime: new Date(now.getTime() + 3 * dayMs),
          timezone: 'UTC',
          recurrence: 'weekly',
        },
        targeting: {
          playerSegments: ['all', 'veterans_level_80_plus'],
          serverClusters: ['Global', 'NA-East', 'EU-Central', 'APAC-East'],
          minLevel: 50,
          maxLevel: 100,
        },
        config: {
          expMultiplier: 2.5,
          dropRateBonusPct: 35,
          goldBonusPct: 20,
        },
        audit: {
          createdBy: req.user?.username || 'root_admin',
          lastModifiedBy: req.user?.username || 'root_admin',
          version: 1,
        },
      },
      {
        name: 'Midsummer Solar Flare EXP Boost',
        slug: 'midsummer-solar-flare-exp',
        description: '200% EXP festival applied across all regional game clusters during peak weekend hours.',
        category: 'exp_boost',
        status: 'scheduled',
        schedule: {
          startTime: new Date(now.getTime() + 1 * dayMs),
          endTime: new Date(now.getTime() + 4 * dayMs),
          timezone: 'UTC',
          recurrence: 'none',
        },
        targeting: {
          playerSegments: ['all'],
          serverClusters: ['Global'],
          minLevel: 1,
          maxLevel: 100,
        },
        config: {
          expMultiplier: 2.0,
          dropRateBonusPct: 15,
          goldBonusPct: 10,
        },
        audit: {
          createdBy: req.user?.username || 'root_admin',
          lastModifiedBy: req.user?.username || 'root_admin',
          version: 1,
        },
      },
      {
        name: 'Daily Attendance Loyalty Campaign',
        slug: 'daily-attendance-campaign',
        description: 'Consecutive 14-day login calendar rewards granting Astral Runes and Legendary summon vouchers.',
        category: 'login_reward',
        status: 'active',
        schedule: {
          startTime: new Date(now.getTime() - 5 * dayMs),
          endTime: new Date(now.getTime() + 9 * dayMs),
          timezone: 'UTC',
          recurrence: 'monthly',
        },
        targeting: {
          playerSegments: ['all'],
          serverClusters: ['Global'],
          minLevel: 1,
          maxLevel: 100,
        },
        config: {
          expMultiplier: 1.0,
          dropRateBonusPct: 0,
          goldBonusPct: 5,
        },
        audit: {
          createdBy: req.user?.username || 'root_admin',
          lastModifiedBy: req.user?.username || 'root_admin',
          version: 1,
        },
      },
    ]);

    // 2. Seed Patch Notes
    const patches = await PatchNote.create([
      {
        version: 'v2.4.0',
        clientBuildNumber: '240.108',
        serverBuildNumber: '240.92',
        title: 'Siege of the Void Rift Update',
        summary: 'Major content release introducing raid tier, guild airships, and itemization balance.',
        status: 'published',
        targetPublishTime: new Date(now.getTime() - 6 * dayMs),
        publishedAt: new Date(now.getTime() - 6 * dayMs),
        requiresMaintenance: true,
        maintenanceDurationMinutes: 120,
        sections: [
          {
            id: 'sec-features',
            title: 'Major New Content',
            category: 'features',
            items: ['Zone 8 unlocked with 12 new dungeon instances', 'Guild Airship Battles and Territorial Siege warfare', 'Mythic Weapon Transmutation Forge'],
          },
          {
            id: 'sec-balance',
            title: 'Class & Weapon Balancing',
            category: 'balance',
            items: ['Sorcerer "Nether Torrent" damage scaled by +12%', 'Knight "Bulwark Stance" cooldown reduced from 45s to 36s'],
          },
        ],
        diffHistory: [],
        author: req.user?.username || 'root_admin',
      },
      {
        version: 'v2.4.1-hotfix.1',
        clientBuildNumber: '241.14',
        serverBuildNumber: '241.11',
        title: 'Urgent Quest & GPU Hotfix',
        summary: 'Targeted hotfix addressing Zone 4 quest progression roadblocks and shader pipeline memory leaks.',
        status: 'approved',
        targetPublishTime: new Date(now.getTime() + 1 * dayMs),
        requiresMaintenance: true,
        maintenanceDurationMinutes: 45,
        sections: [
          {
            id: 'sec-hf-fixes',
            title: 'Hotfix Resolved Issues',
            category: 'bug_fixes',
            items: ['Fixed "Crest of the Fallen" quest drop rate trigger logic in Zone 4', 'Resolved GPU VRAM leak when rendering particle storms on APAC nodes'],
          },
        ],
        diffHistory: [],
        author: req.user?.username || 'root_admin',
      },
    ]);

    // 3. Seed Shop Items
    const shopItems = await ShopItemRotation.create([
      {
        itemId: 'WEAPON_VOIDBANE_01',
        name: 'Voidbane Greatsword of the Eclipse',
        description: 'Mythic two-handed claymore imbued with nether starlight.',
        category: 'weapon',
        rarity: 'mythic',
        pricing: {
          basePrice: 2400,
          currency: 'gems',
          discountPct: 25,
          salePrice: 1800,
        },
        rotationStatus: 'featured',
        schedule: {
          activeFrom: new Date(now.getTime() - 2 * dayMs),
          activeUntil: new Date(now.getTime() + 5 * dayMs),
        },
        previewAssets: {
          iconTag: 'icon_sword_mythic_void',
          hasParticleEffect: true,
        },
        tags: ['featured', 'mythic'],
        lastModifiedBy: req.user?.username || 'root_admin',
      },
      {
        itemId: 'ARMOR_ASTRAL_WINGS_01',
        name: 'Celestial Archangel Wings',
        description: 'Legendary cosmetic backpiece with dynamic shimmering luminescence.',
        category: 'cosmetic',
        rarity: 'legendary',
        pricing: {
          basePrice: 1600,
          currency: 'gems',
          discountPct: 15,
          salePrice: 1360,
        },
        rotationStatus: 'flash_sale',
        schedule: {
          activeFrom: new Date(now.getTime() - 1 * dayMs),
          activeUntil: new Date(now.getTime() + 2 * dayMs),
        },
        previewAssets: {
          iconTag: 'icon_wings_celestial',
          hasParticleEffect: true,
        },
        tags: ['flash_sale', 'cosmetic'],
        lastModifiedBy: req.user?.username || 'root_admin',
      },
      {
        itemId: 'CONSUMABLE_XP_POTION_PACK',
        name: 'Radiant Dragon Elixir Bundle x10',
        description: 'Consumable elixir granting +100% EXP for 4 hours per vial.',
        category: 'consumable',
        rarity: 'rare',
        pricing: {
          basePrice: 500,
          currency: 'gems',
          discountPct: 0,
          salePrice: 500,
        },
        rotationStatus: 'standard',
        schedule: {
          activeFrom: new Date(now.getTime() - 10 * dayMs),
          activeUntil: new Date(now.getTime() + 30 * dayMs),
        },
        previewAssets: {
          iconTag: 'icon_potion_exp',
          hasParticleEffect: false,
        },
        tags: ['standard', 'consumable'],
        lastModifiedBy: req.user?.username || 'root_admin',
      },
    ]);

    // 4. Seed Known Issues
    const issues = await IssueTicket.create([
      {
        ticketKey: 'ISSUE-1042',
        title: 'Quest item drop counter stuck at 90% in Zone 4',
        description: 'Defeating mobs stops crediting quest shards past 9/10 items on high-latency client connections.',
        category: 'quest',
        severity: 'critical_blocker',
        status: 'reported',
        affectedCluster: 'Global',
        clientBuild: '240.108',
        reproductionSteps: ['1. Accept "Crest of the Fallen" quest in Zone 4', '2. Defeat 9 Void Stalkers', '3. 10th mob kill fails to update quest progress counter'],
        reportedBy: 'qa_auditor',
        internalNotes: [{ note: 'Reproduced in staging build 241.14. Fix staged for hotfix release.', author: 'ops_lead', authorRole: 'liveops_editor', timestamp: new Date().toISOString() }],
      },
      {
        ticketKey: 'ISSUE-1043',
        title: 'GPU VRAM Memory Spike on World Boss Particle Storm',
        description: 'Clients using DirectX 12 experience framerate drops when rendering Void Leviathan ultimate phase.',
        category: 'client_crash',
        severity: 'major',
        status: 'investigating',
        affectedCluster: 'APAC-East',
        clientBuild: '240.108',
        reproductionSteps: ['1. Enter Void Leviathan phase 3', '2. Observe GPU memory allocation exceed 8GB'],
        reportedBy: 'qa_auditor',
        internalNotes: [],
      },
      {
        ticketKey: 'ISSUE-1044',
        title: 'Shop Duplicate Currency Charge on Network Packet Retry',
        description: 'Simulated packet loss during item checkout caused duplicate gemstone deduction.',
        category: 'shop_billing',
        severity: 'critical_blocker',
        status: 'fixed',
        affectedCluster: 'EU-Central',
        clientBuild: '240.108',
        reproductionSteps: ['1. Introduce 200ms latency jitter', '2. Purchase item during socket handshake'],
        reportedBy: 'qa_auditor',
        internalNotes: [{ note: 'Idempotency key verified on backend database ledger.', author: 'root_admin', authorRole: 'admin', timestamp: new Date().toISOString() }],
      },
      {
        ticketKey: 'ISSUE-1045',
        title: 'Chat WebSocket Disconnect During Cross-Cluster Server Handoff',
        description: 'Moving party members between regional shards occasionally desyncs local party chat channel.',
        category: 'server_lag',
        severity: 'minor',
        status: 'verified',
        affectedCluster: 'NA-East',
        clientBuild: '240.108',
        reproductionSteps: ['1. Teleport party leader from US-East to EU-Central', '2. Verify socket reconnection latency'],
        reportedBy: 'qa_auditor',
        internalNotes: [{ note: 'Signed off by QA for release.', author: 'qa_auditor', authorRole: 'readonly_viewer', timestamp: new Date().toISOString() }],
      },
    ]);

    await AuditLog.create({
      action: 'CONTENT_OPERATIONS_PRESET_POPULATED',
      entityType: 'system',
      performedBy: req.user?.username || 'Admin',
      userRole: req.user?.role || 'admin',
      details: `Generated complete Content Operations preset: ${events.length} Events, ${patches.length} Patch Notes, ${shopItems.length} Shop Rotations, ${issues.length} Issue Tickets.`,
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      data: {
        message: `Successfully populated Content Operations preset (${events.length} Events, ${patches.length} Patches, ${shopItems.length} Shop Items, ${issues.length} Issues).`,
        counts: {
          events: events.length,
          patches: patches.length,
          shopItems: shopItems.length,
          issues: issues.length,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function clearContentPreset(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [eventsRes, patchesRes, shopRes, issuesRes] = await Promise.all([
      GameEvent.deleteMany({}),
      PatchNote.deleteMany({}),
      ShopItemRotation.deleteMany({}),
      IssueTicket.deleteMany({}),
    ]);

    const totalCleared = (eventsRes.deletedCount || 0) + (patchesRes.deletedCount || 0) + (shopRes.deletedCount || 0) + (issuesRes.deletedCount || 0);

    await AuditLog.create({
      action: 'CONTENT_OPERATIONS_CLEARED',
      entityType: 'system',
      performedBy: req.user?.username || 'Admin',
      userRole: req.user?.role || 'admin',
      details: `Cleared all Content Operations records (${eventsRes.deletedCount} Events, ${patchesRes.deletedCount} Patches, ${shopRes.deletedCount} Shop Items, ${issuesRes.deletedCount} Issues).`,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      data: {
        message: `Successfully cleared all Content Operations records (${totalCleared} total items deleted).`,
        cleared: {
          events: eventsRes.deletedCount,
          patches: patchesRes.deletedCount,
          shopItems: shopRes.deletedCount,
          issues: issuesRes.deletedCount,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}
