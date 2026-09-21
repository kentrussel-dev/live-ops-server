import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { GameServer } from '../models/GameServer';
import { GameEvent } from '../models/GameEvent';
import { PatchNote } from '../models/PatchNote';
import { ShopItemRotation } from '../models/ShopItemRotation';
import { IssueTicket } from '../models/IssueTicket';
import { ChatChannel } from '../models/ChatChannel';
import { ChatMessage } from '../models/ChatMessage';
import { Notification } from '../models/Notification';
import { AuditLog } from '../models/AuditLog';

import { Project } from '../models/Project';

export async function setupTestFixtures() {
  await Promise.all([
    User.deleteMany({}),
    GameServer.deleteMany({}),
    GameEvent.deleteMany({}),
    PatchNote.deleteMany({}),
    ShopItemRotation.deleteMany({}),
    IssueTicket.deleteMany({}),
    Project.deleteMany({}),
    ChatChannel.deleteMany({}),
    ChatMessage.deleteMany({}),
    Notification.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('AetheriaOps2026!', salt);

  const [admin, editor, viewer, developer] = await User.create([
    {
      username: 'root_admin',
      email: 'admin@studio.aetheria.gg',
      passwordHash,
      role: 'admin',
      department: 'Executive Systems & Studio Architecture',
    },
    {
      username: 'ops_lead',
      email: 'editor@liveops.aetheria.gg',
      passwordHash,
      role: 'liveops_editor',
      department: 'Live Operations & Game Systems',
    },
    {
      username: 'qa_auditor',
      email: 'viewer@qa.aetheria.gg',
      passwordHash,
      role: 'readonly_viewer',
      department: 'Quality Assurance & Certification',
    },
    {
      username: 'dev_lead',
      email: 'dev@engineering.aetheria.gg',
      passwordHash,
      role: 'developer',
      department: 'Game Engineering',
    },
  ]);

  const server = await GameServer.create({
    serverId: 'srv-useast-01',
    name: 'US-East Dedicated Server 01',
    host: '198.51.100.24:7777',
    region: 'US-East',
    status: 'online',
    currentPlayers: 3200,
    maxPlayers: 5000,
    pingMs: 18,
    tickRateHz: 60.0,
    cpuUsagePct: 52.0,
    memoryUsagePct: 56.4,
    bandwidthMbps: 410,
    lockedForLogins: false,
    uptimeSeconds: 86400,
  });

  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;

  const event = await GameEvent.create({
    name: 'Void Leviathan World Boss Incursion',
    slug: 'void-leviathan-incursion',
    description: 'Server-wide cooperative raid battle in the Abyssal Rift.',
    category: 'world_boss',
    status: 'active',
    schedule: {
      startTime: new Date(now.getTime() - 2 * dayMs),
      endTime: new Date(now.getTime() + 3 * dayMs),
      timezone: 'UTC',
      recurrence: 'weekly',
    },
    targeting: {
      playerSegments: ['all'],
      serverClusters: ['Global'],
      minLevel: 50,
      maxLevel: 100,
    },
    config: {
      expMultiplier: 2.5,
      dropRateBonusPct: 35,
      goldBonusPct: 20,
    },
    audit: {
      createdBy: 'root_admin',
      lastModifiedBy: 'root_admin',
      version: 1,
    },
  });

  const [patch1, patch2] = await PatchNote.create([
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
          items: ['Zone 8 unlocked with 12 new dungeon instances'],
        },
      ],
      diffHistory: [],
      author: 'root_admin',
    },
    {
      version: 'v2.4.1-hotfix.1',
      clientBuildNumber: '241.14',
      serverBuildNumber: '241.11',
      title: 'Urgent Quest & GPU Hotfix',
      summary: 'Targeted hotfix.',
      status: 'approved',
      targetPublishTime: new Date(now.getTime() + 1 * dayMs),
      requiresMaintenance: true,
      maintenanceDurationMinutes: 45,
      sections: [
        {
          id: 'sec-hf-fixes',
          title: 'Hotfix Resolved Issues',
          category: 'bug_fixes',
          items: ['Fixed quest drop rate trigger'],
        },
      ],
      diffHistory: [],
      author: 'root_admin',
    },
  ]);

  const shopItem = await ShopItemRotation.create({
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
    lastModifiedBy: 'root_admin',
  });

  const issue = await IssueTicket.create({
    ticketKey: 'ISSUE-1042',
    title: 'Quest item drop counter stuck at 90% in Zone 4',
    description: 'Defeating mobs stops crediting quest shards past 9/10 items on high-latency client connections.',
    category: 'quest',
    severity: 'critical_blocker',
    status: 'investigating',
    affectedCluster: 'Global',
    reproductionSteps: ['1. Accept quest in Zone 4', '2. Defeat 9 Void Stalkers'],
    reportedBy: 'qa_auditor',
    assignedTo: editor.username,
    internalNotes: [],
  });

  const notification = await Notification.create({
    recipientId: admin._id,
    type: 'system_alert',
    title: 'Incident Alert',
    message: 'High priority issue ticket reported.',
    isRead: false,
    severity: 'critical',
  });

  const channel = await ChatChannel.create({
    name: 'general',
    slug: 'general',
    description: 'Main operational communications channel.',
    isDirectMessage: false,
    createdBy: admin._id.toString(),
  });

  return { admin, editor, viewer, server, event, patch: patch1, shopItem, issue, notification, channel };
}
