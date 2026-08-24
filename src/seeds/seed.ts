import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User';
import { GameEvent } from '../models/GameEvent';
import { PatchNote } from '../models/PatchNote';
import { ShopItemRotation } from '../models/ShopItemRotation';
import { IssueTicket } from '../models/IssueTicket';
import { AuditLog } from '../models/AuditLog';
import { GameServer } from '../models/GameServer';
import { ChatChannel } from '../models/ChatChannel';
import { ChatMessage } from '../models/ChatMessage';
import { Notification } from '../models/Notification';

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
    ChatChannel.deleteMany({}),
    ChatMessage.deleteMany({}),
    Notification.deleteMany({}),
  ]);

  const passwordHash = await bcrypt.hash('AetheriaOps2026!', 10);

  // 1. Seed Operators
  const users = await User.create([
    {
      username: 'root_admin',
      email: 'admin@studio.aetheria.gg',
      passwordHash,
      role: 'admin',
      department: 'Studio Leadership',
      position: 'Principal Operations Administrator',
      departmentDescription: 'Executive studio governance, master cluster override authority, and infrastructure lifecycle management.',
      bio: 'Master operational supervisor managing live-service server clusters, system security permissions, and emergency protocol dispatch.',
      statusMessage: 'Overseeing live game cluster operations',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&auto=format&fit=crop&q=80',
    },
    {
      username: 'ops_lead',
      email: 'editor@liveops.aetheria.gg',
      passwordHash,
      role: 'liveops_editor',
      department: 'Live Operations',
      position: 'Live-Ops Executive Producer',
      departmentDescription: 'Orchestrates multi-track live event calendars, emergency maintenance lockouts, and emergency broadcast dispatches.',
      bio: 'Leads operational response, schedule coordination, and real-time telemetry monitoring across all live server realms.',
      statusMessage: 'Coordinating v2.4.1 hotfix schedule',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80',
    },
    {
      username: 'qa_auditor',
      email: 'viewer@qa.aetheria.gg',
      passwordHash,
      role: 'readonly_viewer',
      department: 'Quality Assurance',
      position: 'Senior QA Compliance Auditor',
      departmentDescription: 'Conducts operational compliance audits, bug reproduction pipelines, and release gate validations.',
      bio: 'Responsible for verifying staging build fixes, tamper-evident audit logs, and telemetry sanity checks.',
      statusMessage: 'Running compliance audit on Patch 2.4.0',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80',
    },
    {
      username: 'Christian Roi S. Neri',
      email: 'christian.neri@aetheria.gg',
      passwordHash,
      role: 'liveops_editor',
      department: 'Client Engineering',
      position: 'Lead Client Systems Engineer',
      departmentDescription: 'Directs mobile client engineering, Unreal Engine rendering pipelines, client memory optimization, and Over-The-Air asset patching.',
      bio: 'Senior graphics and gameplay systems engineer specializing in mobile MMORPG client optimization, SIT/Beta build stability, and low-latency packet serialization.',
      statusMessage: 'Profiling SIT build on mobile client',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500&auto=format&fit=crop&q=80',
    },
    {
      username: 'Mark Aubrey D. Has',
      email: 'mark.has@aetheria.gg',
      passwordHash,
      role: 'liveops_editor',
      department: 'Server Infrastructure',
      position: 'Lead Server Systems Architect',
      departmentDescription: 'Oversees distributed game server clusters, high-tick synchronization, matchmaking gateways, and real-time state persistence.',
      bio: 'Backend infrastructure architect responsible for Kubernetes dedicated server orchestration, UDP connection multiplexing, and database scaling.',
      statusMessage: 'Tuning tick rate on AP-East cluster',
      avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=500&auto=format&fit=crop&q=80',
    },
    {
      username: 'Prince Jay A. Domingo',
      email: 'prince.domingo@aetheria.gg',
      passwordHash,
      role: 'liveops_editor',
      department: 'Security & Anticheat',
      position: 'Security & Anticheat Lead',
      departmentDescription: 'Monitors network telemetry, memory injection anomalies, botting patterns, and enforces server-side game state verification.',
      bio: 'Cybersecurity specialist focused on client tamper resistance, automated anticheat heuristics, and live exploit mitigation.',
      statusMessage: 'Investigating anomalous gold transactions',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=500&auto=format&fit=crop&q=80',
    },
    {
      username: 'Jaymark A. Zaporteza',
      email: 'jaymark.zaporteza@aetheria.gg',
      passwordHash,
      role: 'readonly_viewer',
      department: 'QA & Compliance',
      position: 'Lead QA Automation Engineer',
      departmentDescription: 'Leads release regression testing, device farm compatibility matrix verification, and ticket verification workflows.',
      bio: 'QA lead overseeing end-to-end regression validation, performance profiling on iOS/Android, and blocker triage.',
      statusMessage: 'Verifying world boss collision fix in SIT',
      avatarUrl: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=500&auto=format&fit=crop&q=80',
    },
    {
      username: 'Edizon G. Caragay',
      email: 'edizon.caragay@aetheria.gg',
      passwordHash,
      role: 'liveops_editor',
      department: 'Game Design',
      position: 'Principal Combat & Economy Designer',
      departmentDescription: 'Designs in-game world boss encounters, drop rate tables, virtual economy rotations, and class balance scaling.',
      bio: 'MMORPG balance specialist managing item power curves, raid mechanics, and promotional flash discount schedules.',
      statusMessage: 'Balancing Mythic Voidwalker drop rates',
      avatarUrl: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=500&auto=format&fit=crop&q=80',
    },
    {
      username: 'Eleanor S. Melendez',
      email: 'eleanor.melendez@aetheria.gg',
      passwordHash,
      role: 'admin',
      department: 'Studio HR & Operations',
      position: 'Studio Director & HR Operations',
      departmentDescription: 'Coordinates cross-disciplinary studio operations, personnel alignment, compliance governance, and production roadmaps.',
      bio: 'Executive producer overseeing live-service roadmap delivery, studio operations, and cross-team synchronization.',
      statusMessage: 'Reviewing quarterly live-ops roadmap',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&auto=format&fit=crop&q=80',
    },
    {
      username: 'Ronald Rainier Aguila',
      email: 'ronald.aguila@aetheria.gg',
      passwordHash,
      role: 'liveops_editor',
      department: 'SRE & Deployment',
      position: 'Site Reliability & Deployment Lead',
      departmentDescription: 'Ensures 99.99% server fleet availability, automated zero-downtime hotfix deployments, and CI/CD artifact verification.',
      bio: 'DevOps and SRE specialist maintaining regional fleet infrastructure across US, EU, AP, and SA datacenters.',
      statusMessage: 'Monitoring fleet traffic draining',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80',
    },
  ]);

  console.log(`[Seed] Created ${users.length} operator accounts.`);

  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const hourMs = 60 * 60 * 1000;

  // 2. Seed Technical Game Servers
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
        {
          id: 'sec-balance',
          title: 'Balance Tweaks',
          category: 'balance',
          items: ['Sorcerer damage increased by 8%'],
        },
      ],
      diffHistory: [],
      author: 'ops_lead',
    },
    {
      version: 'v2.3.9',
      clientBuildNumber: '239.501',
      serverBuildNumber: '239.420',
      title: 'Netcode Latency & Performance Maintenance',
      summary: 'Maintenance release addressing zone replication lag and inventory sync.',
      status: 'published',
      targetPublishTime: new Date(now.getTime() - 14 * dayMs),
      publishedAt: new Date(now.getTime() - 14 * dayMs),
      requiresMaintenance: false,
      sections: [
        {
          id: 'sec-perf',
          title: 'Performance',
          category: 'bug_fixes',
          items: ['Reduced UDP socket buffer overhead in NA-East'],
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

  // 6. Seed Known Issues with Assignees
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
      assignedTo: 'root_admin',
      reproductionSteps: ['1. Accept quest', '2. Collect 9 items'],
      reportedBy: 'qa_auditor',
      internalNotes: [{ author: 'qa_auditor', authorRole: 'readonly_viewer', note: 'Assigned to @root_admin for investigation.', timestamp: new Date().toISOString() }],
    },
    {
      ticketKey: 'ISSUE-1043',
      title: 'Auto Skill Cheat Allows Damage Before Duel Countdown Ends',
      description: 'Client modification packet injection allows bypassing 3-second countdown lock in PvP duels.',
      category: 'combat_balance',
      severity: 'critical_blocker',
      status: 'investigating',
      affectedCluster: 'NA-East',
      clientBuild: '240.108',
      assignedTo: 'Christian Roi S. Neri',
      reproductionSteps: ['1. Initiate PvP duel', '2. Cast burst skill before countdown reach 0'],
      reportedBy: 'Prince Jay A. Domingo',
      internalNotes: [],
    },
  ]);

  // 7. Seed Chat Channels (Matching Discuss Mockup)
  const channelData = [
    { name: 'General', slug: 'general', description: 'General announcements for all employees.' },
    { name: 'Mobile Realm', slug: 'mobile-realm', description: 'Mobile client performance and optimization channel.' },
    { name: 'On-Site', slug: 'on-site', description: 'Datacenter hardware, physical racks and edge routing.' },
    { name: 'PolyGuns', slug: 'polyguns', description: 'Weapon ballistics, collision mechanics and hit registration.' },
    { name: 'Walk Online - New Devs', slug: 'walk-online-new-devs', description: 'Onboarding and dev environment setup.' },
    { name: 'Walk Online Team', slug: 'walk-online-team', description: 'General studio and team milestone coordination.' },
    { name: 'Walk Online Team - Dev', slug: 'walk-online-team-dev', description: 'Engine architecture, server profiling and build logs.' },
    { name: 'Walk Online Team - Devs + QAs', slug: 'walk-online-team-devs-qas', description: 'Cross-functional bug triage, repro steps and hotfixes.' },
  ];

  const channels = await ChatChannel.create(
    channelData.map((c) => ({
      ...c,
      isDirectMessage: false,
      members: users.map((u) => u._id),
      createdBy: 'root_admin',
    }))
  );

  const generalChannel = channels[0];
  const devQaChannel = channels[7];

  // 8. Seed Direct Message Channel between root_admin and Christian Roi S. Neri
  const rootUser = users[0];
  const christian = users[3];

  const dmChannel = await ChatChannel.create({
    name: `DM: ${rootUser.username} & ${christian.username}`,
    slug: `dm-${rootUser._id}-${christian._id}`,
    description: `Direct message conversation with ${christian.username}`,
    isDirectMessage: true,
    members: [rootUser._id, christian._id],
    createdBy: rootUser.username,
  });

  // Seed Messages in DM (Matching User's Mockup)
  await ChatMessage.create([
    {
      channelId: dmChannel._id,
      sender: {
        _id: christian._id,
        username: christian.username,
        avatarUrl: christian.avatarUrl,
        role: christian.role,
        department: christian.department,
      },
      recipientId: rootUser._id,
      content: 'Try mo ibang account',
      status: 'seen',
      seenBy: [{ userId: rootUser._id, username: rootUser.username, seenAt: new Date(now.getTime() - 14 * hourMs) }],
      attachments: [],
      reactions: [],
      createdAt: new Date(now.getTime() - 14 * hourMs),
    },
    {
      channelId: dmChannel._id,
      sender: {
        _id: rootUser._id,
        username: rootUser.username,
        avatarUrl: rootUser.avatarUrl,
        role: rootUser.role,
        department: rootUser.department,
      },
      recipientId: christian._id,
      content: 'sige',
      status: 'seen',
      seenBy: [{ userId: christian._id, username: christian.username, seenAt: new Date(now.getTime() - 14 * hourMs) }],
      attachments: [],
      reactions: [],
      createdAt: new Date(now.getTime() - 14 * hourMs + 60000),
    },
    {
      channelId: dmChannel._id,
      sender: {
        _id: rootUser._id,
        username: rootUser.username,
        avatarUrl: rootUser.avatarUrl,
        role: rootUser.role,
        department: rootUser.department,
      },
      recipientId: christian._id,
      content: 'boss yong bagong build sakin',
      status: 'seen',
      seenBy: [{ userId: christian._id, username: christian.username, seenAt: new Date(now.getTime() - 13 * hourMs) }],
      attachments: [],
      reactions: [],
      createdAt: new Date(now.getTime() - 13 * hourMs),
    },
    {
      channelId: dmChannel._id,
      sender: {
        _id: rootUser._id,
        username: rootUser.username,
        avatarUrl: rootUser.avatarUrl,
        role: rootUser.role,
        department: rootUser.department,
      },
      recipientId: christian._id,
      content: 'sit',
      status: 'seen',
      seenBy: [{ userId: christian._id, username: christian.username, seenAt: new Date(now.getTime() - 13 * hourMs) }],
      attachments: [],
      reactions: [],
      createdAt: new Date(now.getTime() - 13 * hourMs + 30000),
    },
    {
      channelId: dmChannel._id,
      sender: {
        _id: christian._id,
        username: christian.username,
        avatarUrl: christian.avatarUrl,
        role: christian.role,
        department: christian.department,
      },
      recipientId: rootUser._id,
      content: 'Sge rus tagal download nasa beta pa me',
      status: 'seen',
      seenBy: [{ userId: rootUser._id, username: rootUser.username, seenAt: new Date(now.getTime() - 12 * hourMs) }],
      attachments: [],
      reactions: [],
      createdAt: new Date(now.getTime() - 12 * hourMs),
    },
    {
      channelId: dmChannel._id,
      sender: {
        _id: rootUser._id,
        username: rootUser.username,
        avatarUrl: rootUser.avatarUrl,
        role: rootUser.role,
        department: rootUser.department,
      },
      recipientId: christian._id,
      content: 'ay gege lang man lipat ko na ticket uli sa sit',
      status: 'seen',
      seenBy: [{ userId: christian._id, username: christian.username, seenAt: new Date(now.getTime() - 12 * hourMs + 10000) }],
      attachments: [],
      reactions: [],
      createdAt: new Date(now.getTime() - 12 * hourMs + 10000),
    },
    {
      channelId: dmChannel._id,
      sender: {
        _id: christian._id,
        username: christian.username,
        avatarUrl: christian.avatarUrl,
        role: christian.role,
        department: christian.department,
      },
      recipientId: rootUser._id,
      content: 'Sge sge rus',
      status: 'delivered',
      seenBy: [],
      attachments: [],
      reactions: [],
      createdAt: new Date(now.getTime() - 12 * hourMs + 40000),
    },
  ]);

  // Seed Messages in General
  const eleanor = users[8];
  const ronald = users[9];

  await ChatMessage.create([
    {
      channelId: generalChannel._id,
      sender: {
        _id: eleanor._id,
        username: eleanor.username,
        avatarUrl: eleanor.avatarUrl,
        role: eleanor.role,
        department: eleanor.department,
      },
      content: 'Hello everyone, our payroll will be delayed due to an MBOS system downtime. We apologize for the inconvenience. I will keep everyone updated as soon as I receive information. Thank you for your patience and understanding.',
      status: 'seen',
      seenBy: [{ userId: rootUser._id, seenAt: new Date(now.getTime() - 25 * dayMs) }],
      attachments: [],
      reactions: [],
      createdAt: new Date(now.getTime() - 25 * dayMs),
    },
    {
      channelId: generalChannel._id,
      sender: {
        _id: eleanor._id,
        username: eleanor.username,
        avatarUrl: eleanor.avatarUrl,
        role: eleanor.role,
        department: eleanor.department,
      },
      content: "Just a quick update — MBOS is still experiencing system downtime as of this time, so payroll is still on hold. We're continuously monitoring the situation and will keep you posted as soon as there's any update. Thanks so much for your patience and understanding!",
      status: 'seen',
      seenBy: [{ userId: rootUser._id, seenAt: new Date(now.getTime() - 20 * dayMs) }],
      attachments: [],
      reactions: [],
      createdAt: new Date(now.getTime() - 20 * dayMs),
    },
    {
      channelId: generalChannel._id,
      sender: {
        _id: eleanor._id,
        username: eleanor.username,
        avatarUrl: eleanor.avatarUrl,
        role: eleanor.role,
        department: eleanor.department,
      },
      content: 'Hello everyone! Lalabas muna ako para ipacheck ang work laptop ko. Baka ma-delay nang kaunti ang replies ko habang nasa labas. Salamat!',
      status: 'seen',
      seenBy: [{ userId: rootUser._id, seenAt: new Date(now.getTime() - 14 * dayMs) }],
      attachments: [],
      reactions: [{ reaction: '👍', users: ['root_admin', 'ops_lead'] }],
      createdAt: new Date(now.getTime() - 14 * dayMs),
    },
    {
      channelId: generalChannel._id,
      sender: {
        _id: ronald._id,
        username: ronald.username,
        avatarUrl: ronald.avatarUrl,
        role: ronald.role,
        department: ronald.department,
      },
      content: 'Server maintenance window for Client Build 240.108 and Hotfix 2.4.1 deployment has been pre-scheduled on the operations matrix.',
      status: 'delivered',
      seenBy: [],
      attachments: [],
      reactions: [],
      createdAt: new Date(now.getTime() - 2 * dayMs),
    },
    {
      channelId: generalChannel._id,
      sender: {
        _id: users[5]._id,
        username: users[5].username,
        avatarUrl: users[5].avatarUrl,
        role: users[5].role,
        department: users[5].department,
      },
      content: 'https://meet.google.com/aiv-nwre-vzk',
      status: 'seen',
      seenBy: [{ userId: rootUser._id, seenAt: new Date(now.getTime() - 60 * dayMs) }],
      attachments: [],
      reactions: [],
      createdAt: new Date(now.getTime() - 60 * dayMs),
    },
  ]);

  // 9. Seed Notifications
  await Notification.create([
    {
      recipientId: rootUser._id,
      sender: { _id: christian._id, username: christian.username, avatarUrl: christian.avatarUrl },
      type: 'direct_message',
      title: `Direct message from ${christian.username}`,
      message: 'Sge sge rus',
      entityType: 'channel',
      entityId: dmChannel._id.toString(),
      isRead: false,
      createdAt: new Date(now.getTime() - 12 * hourMs + 40000),
    },
    {
      recipientId: rootUser._id,
      sender: { _id: users[3]._id, username: users[3].username, avatarUrl: users[3].avatarUrl },
      type: 'ticket_assigned',
      title: '[Cheat] Auto Skill Cheat Allows Damage Before Duel Countdown Ends',
      message: 'Subject: You have been assigned to [Cheat] Auto Skill Cheat Allows Damage Before Duel Countdown Ends\nDear root_admin,\nYou have been assigned to this critical issue ticket.',
      entityType: 'issue',
      entityId: issues[1]._id.toString(),
      isRead: false,
      createdAt: new Date(now.getTime() - 2 * dayMs),
    },
    {
      recipientId: rootUser._id,
      sender: { _id: eleanor._id, username: eleanor.username, avatarUrl: eleanor.avatarUrl },
      type: 'status_change',
      title: 'Eleanor S. Melendez on Sick Leave: 1.00 days',
      message: 'Your Time Off Request Planned on 2026-08-13 has been accepted.',
      entityType: 'server',
      isRead: false,
      createdAt: new Date(now.getTime() - 12 * dayMs),
    },
  ]);

  // 10. Seed Initial Audit Logs
  await AuditLog.create([
    {
      action: 'SYSTEM_BOOTSTRAP',
      entityType: 'system',
      performedBy: 'root_admin',
      userRole: 'admin',
      details: 'Live-Ops Console initialized with Discuss Channels, Notifications, SRE fleet, and operational catalogs.',
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
