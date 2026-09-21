export type UserRole = 'admin' | 'liveops_editor' | 'readonly_viewer' | 'developer';

export interface IKanbanColumn {
  id: string;
  name: string;
  order: number;
  color?: string;
}

export interface IProject {
  _id: string;
  name: string;
  key: string;
  description?: string;
  columns: IKanbanColumn[];
  categories?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface IUser {
  _id: string;
  username: string;
  email: string;
  role: UserRole;
  department: string;
  position?: string;
  departmentDescription?: string;
  bio?: string;
  statusMessage?: string;
  avatarUrl?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IOperatorProfile extends IUser {
  assignedTickets?: any[];
  metrics?: {
    totalAssignedTickets: number;
    openTickets: number;
    resolvedTickets: number;
    authoredPatchesCount: number;
    createdEventsCount: number;
  };
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

export type ShopItemCategory = 'weapon' | 'armor' | 'consumable' | 'cosmetic' | 'currency_bundle';
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
export type RotationStatus = 'draft' | 'scheduled' | 'active' | 'featured' | 'standard' | 'flash_sale' | 'expired' | 'retired' | 'vaulted';

export interface IShopItemRotation {
  _id: string;
  itemId: string;
  name: string;
  description: string;
  category: ShopItemCategory;
  rarity: ItemRarity;
  pricing: {
    basePrice: number;
    currency: 'gold' | 'gems' | 'honor_tokens' | 'event_medals';
    discountPct: number;
    salePrice: number;
  };
  rotationStatus: RotationStatus;
  schedule: {
    activeFrom: string;
    activeUntil: string;
  };
  limits?: {
    perPlayerCap?: number;
    globalServerStock?: number;
    currentPurchasesTotal?: number;
  };
  previewAssets?: {
    iconTag?: string;
    hasParticleEffect?: boolean;
  };
  tags: string[];
  lastModifiedBy: string;
  createdAt: string;
  updatedAt: string;
}

export type IssueSeverity = 'high' | 'very_high' | 'most_important';
export type IssuePriority = IssueSeverity;
export type IssueStatus = 'todo' | 'doing' | 'develop' | 'testing' | 'done' | string;
export type IssueCategory = string;

export interface IIssueInternalNote {
  author: string;
  authorRole: string;
  note: string;
  timestamp: string;
}

export interface IIssueAssignee {
  _id: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  role?: string;
  department?: string;
}

export interface IIssueTicket {
  _id: string;
  ticketKey: string;
  title: string;
  description: string;
  category: IssueCategory;
  severity: IssueSeverity;
  status: IssueStatus;
  projectId?: string;
  affectedEventId?: string;
  affectedVersion?: string;
  clientBuild?: string;
  affectedCluster?: ServerCluster;
  reproductionSteps: string[];
  assignedTo?: string | IIssueAssignee;
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

// ==============================================================
// DOMAIN 3: REAL-TIME DISCUSS, CHANNELS, DIRECT MESSAGES & INBOX
// ==============================================================
export interface IChatChannel {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  isDirectMessage: boolean;
  members?: string[];
  dmTargetUser?: IUser;
  unreadCount?: number;
  lastMessage?: {
    content: string;
    senderName: string;
    createdAt: string;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface IChatAttachment {
  name: string;
  url: string;
  size: number;
  type: string;
}

export interface IChatReaction {
  reaction: string;
  count: number;
  users: string[];
}

export interface IChatMessageReply {
  messageId: string;
  senderName: string;
  senderAvatarUrl?: string;
  content: string;
}

export interface IChatMessage {
  _id: string;
  channelId: string;
  sender: {
    _id: string;
    username: string;
    avatarUrl?: string;
    role: UserRole;
    department?: string;
  };
  recipientId?: string;
  content: string;
  replyTo?: IChatMessageReply;
  status?: 'delivered' | 'seen';
  seenBy?: Array<{
    userId: string;
    username?: string;
    seenAt: string;
  }>;
  attachments?: IChatAttachment[];
  reactions?: IChatReaction[];
  createdAt: string;
  updatedAt: string;
}

export type NotificationType = 'ticket_assigned' | 'mention' | 'direct_message' | 'system_alert' | 'status_change';

export interface INotification {
  _id: string;
  recipientId: string;
  sender?: {
    _id: string;
    username: string;
    avatarUrl?: string;
  };
  type: NotificationType;
  title: string;
  message: string;
  entityType?: 'issue' | 'channel' | 'event' | 'server';
  entityId?: string;
  isRead: boolean;
  createdAt: string;
}
