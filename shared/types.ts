export type UserRole = 'admin' | 'liveops_editor' | 'readonly_viewer';

export interface IUser {
  _id: string;
  username: string;
  email: string;
  role: UserRole;
  department: string;
  avatarUrl?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type EventCategory = 'raid' | 'exp_boost' | 'community' | 'login_reward' | 'pvp_season' | 'world_boss' | 'maintenance';
export type EventStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'cancelled';
export type ServerCluster = 'NA-East' | 'EU-Central' | 'APAC-East' | 'Global' | 'Staging-Internal';
export type PlayerSegment = 'all' | 'new_players' | 'veterans_level_80_plus' | 'vip_tier_3' | 'guild_leaders' | 'dormant_returnees';

export interface IGameEvent {
  _id: string;
  name: string;
  slug: string;
  description: string;
  category: EventCategory;
  status: EventStatus;
  schedule: {
    startTime: string;
    endTime: string;
    timezone: string;
    recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
  };
  targeting: {
    playerSegments: PlayerSegment[];
    serverClusters: ServerCluster[];
    minLevel?: number;
    maxLevel?: number;
  };
  config: {
    expMultiplier?: number;
    dropRateBonusPct?: number;
    goldBonusPct?: number;
    specialRules?: string[];
    bannerAssetUrl?: string;
  };
  audit: {
    createdBy: string;
    lastModifiedBy: string;
    version: number;
  };
  createdAt: string;
  updatedAt: string;
}

export type PatchStatus = 'draft' | 'in_review' | 'approved' | 'published' | 'archived';

export interface IPatchSection {
  id: string;
  title: string;
  category: 'features' | 'balance' | 'bug_fixes' | 'known_issues' | 'infrastructure';
  items: string[];
}

export interface IPatchDiffHistory {
  version: string;
  author: string;
  timestamp: string;
  summary: string;
  snapshotData: string;
}

export interface IPatchNote {
  _id: string;
  version: string;
  clientBuildNumber: string;
  serverBuildNumber: string;
  title: string;
  summary: string;
  status: PatchStatus;
  targetPublishTime: string;
  publishedAt?: string;
  requiresMaintenance: boolean;
  maintenanceDurationMinutes?: number;
  sections: IPatchSection[];
  diffHistory: IPatchDiffHistory[];
  author: string;
  createdAt: string;
  updatedAt: string;
}

export type ItemCategory = 'weapon' | 'armor' | 'consumable' | 'cosmetic' | 'mount' | 'bundle' | 'currency';
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
export type RotationStatus = 'featured' | 'standard' | 'flash_sale' | 'retired' | 'vaulted';
export type CurrencyType = 'gems' | 'gold' | 'valor_tokens' | 'rift_shards';

export interface IShopItemRotation {
  _id: string;
  itemId: string;
  name: string;
  description: string;
  category: ItemCategory;
  rarity: ItemRarity;
  pricing: {
    basePrice: number;
    currency: CurrencyType;
    discountPct: number;
    salePrice: number;
  };
  rotationStatus: RotationStatus;
  schedule: {
    activeFrom: string;
    activeUntil: string;
    stockLimitPerUser?: number;
    globalStockRemaining?: number;
  };
  previewAssets: {
    iconTag: string;
    modelPreviewTag?: string;
    hasParticleEffect?: boolean;
    tierGlowHex?: string;
  };
  tags: string[];
  lastModifiedBy: string;
  createdAt: string;
  updatedAt: string;
}

export type IssueCategory = 'quest' | 'loot_table' | 'combat_balance' | 'client_crash' | 'shop_billing' | 'server_lag' | 'ui_glitch';
export type IssueSeverity = 'critical_blocker' | 'major' | 'moderate' | 'minor';
export type IssueStatus = 'reported' | 'investigating' | 'fixed' | 'verified' | 'closed';

export interface IIssueInternalNote {
  _id?: string;
  author: string;
  authorRole: string;
  note: string;
  timestamp: string;
}

export interface IIssueTicket {
  _id: string;
  ticketKey: string;
  title: string;
  description: string;
  category: IssueCategory;
  severity: IssueSeverity;
  status: IssueStatus;
  affectedEventId?: string;
  affectedVersion?: string;
  affectedCluster?: ServerCluster;
  reproductionSteps: string[];
  assignedTo?: string;
  reportedBy: string;
  internalNotes: IIssueInternalNote[];
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ITimelineTrackItem {
  id: string;
  track: 'event' | 'patch' | 'shop' | 'incident';
  title: string;
  category: string;
  status: string;
  startTime: string;
  endTime: string;
  urgencyOrRarity?: string;
  subtitle?: string;
  metadata?: Record<string, any>;
}

export interface IOperationalStats {
  activeEventsCount: number;
  upcomingEventsCount: number;
  activeFlashSalesCount: number;
  criticalIssuesCount: number;
  openIssuesCount: number;
  latestPublishedPatch: string;
  systemStatus: 'nominal' | 'degraded' | 'maintenance' | 'incident_active';
  connectedClusters: {
    cluster: ServerCluster;
    status: 'online' | 'warning' | 'offline';
    activePlayersEstimate: number;
    latencyMs: number;
  }[];
}

// ==============================================================
// DOMAIN 2: TECHNICAL GAME SERVER FLEET & INFRASTRUCTURE SRE
// ==============================================================
export type ServerNodeStatus = 'online' | 'high_load' | 'draining' | 'maintenance' | 'offline';
export type ServerRegion = 'US-East' | 'US-West' | 'EU-Central' | 'EU-West' | 'AP-East' | 'AP-South' | 'SA-East';

export interface IGameServer {
  _id: string;
  serverId: string;
  name: string;
  host: string;
  region: ServerRegion;
  status: ServerNodeStatus;
  currentPlayers: number;
  maxPlayers: number;
  pingMs: number;
  tickRateHz: number;
  cpuUsagePct: number;
  memoryUsagePct: number;
  bandwidthMbps: number;
  lockedForLogins: boolean;
  uptimeSeconds: number;
  lastHeartbeat: string;
  createdAt: string;
  updatedAt: string;
}

export interface IFleetSummary {
  totalServers: number;
  onlineServers: number;
  totalCcu: number;
  totalCapacity: number;
  utilizationPct: number;
  avgPingMs: number;
  avgTickRateHz: number;
}
