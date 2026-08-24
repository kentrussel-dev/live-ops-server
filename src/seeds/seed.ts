import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User';
import { GameEvent } from '../models/GameEvent';
import { PatchNote } from '../models/PatchNote';
import { ShopItemRotation } from '../models/ShopItemRotation';
import { IssueTicket } from '../models/IssueTicket';
import { AuditLog } from '../models/AuditLog';
import { GameServer } from '../models/GameServer';

export async function seedDatabase() {
  console.log('[Seed] Starting production seed for Aetheria Live-Ops Console...');
  await connectDB();

  // Clear existing collections
  await Promise.all([
    User.deleteMany({}),
    GameEvent.deleteMany({}),
    PatchNote.deleteMany({}),
    ShopItemRotation.deleteMany({}),
    IssueTicket.deleteMany({}),
    AuditLog.deleteMany({}),
    GameServer.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash('AetheriaOps2026!', 10);

  // 1. Seed Operators
  const users = await User.create([
    {
      username: 'ops_lead',
      email: 'editor@liveops.aetheria.gg',
      passwordHash,
      role: 'liveops_editor',
      department: 'Live Operations',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    },
    {
      username: 'qa_auditor',
      email: 'viewer@qa.aetheria.gg',
      passwordHash,
      role: 'readonly_viewer',
      department: 'Quality Assurance',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    },
    {
      username: 'studio_exec',
      email: 'admin@studio.aetheria.gg',
      passwordHash,
      role: 'admin',
      department: 'Studio Leadership',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    },
  ]);

  console.log(`[Seed] Created ${users.length} operator accounts.`);

  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  // 2. Seed Technical Game Servers (Infrastructure & SRE Fleet)
  const servers = await GameServer.create([
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
  ]);

  console.log(`[Seed] Created ${servers.length} technical game servers.`);

  // 3. Seed Game Events
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
        createdBy: 'ops_lead',
        lastModifiedBy: 'ops_lead',
        version: 1,
      },
    },
  ]);

  // 4. Seed Patch Notes
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
      sections: [
        {
          id: 'sec-features',
          title: 'Major New Content',
          category: 'features',
          items: ['Zone 8 unlocked', 'Guild Airship Battles'],
        },
      ],
      diffHistory: [],
      author: 'ops_lead',
    },
    {
      version: 'v2.4.1-hotfix.1',
      clientBuildNumber: '241.14',
      serverBuildNumber: '241.11',
      title: 'Urgent Quest & GPU Hotfix',
      summary: 'Targeted hotfix addressing Zone 4 quest progression roadblocks.',
      status: 'approved',
      targetPublishTime: new Date(now.getTime() + 1 * dayMs),
      requiresMaintenance: true,
      sections: [
        {
          id: 'sec-hf-fixes',
          title: 'Hotfix Resolved Issues',
          category: 'bug_fixes',
          items: ['Fixed "Crest of the Fallen" quest drop rate trigger logic in Zone 4.'],
        },
      ],
      diffHistory: [],
      author: 'ops_lead',
    },
  ]);

  // 5. Seed Shop Items
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
      },
      tags: ['featured', 'mythic'],
      lastModifiedBy: 'ops_lead',
    },
  ]);

  // 6. Seed Known Issues
  const issues = await IssueTicket.create([
    {
      ticketKey: 'ISSUE-1042',
      title: 'Quest item drop counter stuck at 90% in Zone 4',
      description: 'Defeating mobs stops crediting quest shards past 9/10 items.',
      category: 'quest',
      severity: 'critical_blocker',
      status: 'investigating',
      reproductionSteps: ['1. Accept quest', '2. Collect 9 items'],
      reportedBy: 'qa_auditor',
      internalNotes: [],
    },
  ]);

  // 7. Seed Initial Audit Logs
  await AuditLog.create([
    {
      action: 'SYSTEM_BOOTSTRAP',
      entityType: 'system',
      performedBy: 'studio_exec',
      userRole: 'admin',
      details: 'Live-Ops Console initialized with server infrastructure and operational catalogs.',
    },
  ]);

  console.log('[Seed] Database seed completed successfully!');
}

if (require.main === module) {
  seedDatabase()
    .then(async () => {
      await disconnectDB();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[Seed Error]:', err);
      await disconnectDB();
      process.exit(1);
    });
}
