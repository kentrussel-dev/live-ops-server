import { Schema, model, Document } from 'mongoose';
import { EventCategory, EventStatus, ServerCluster, PlayerSegment } from '../../shared/types';

export interface IGameEventDocument extends Document {
  name: string;
  slug: string;
  description: string;
  category: EventCategory;
  status: EventStatus;
  schedule: {
    startTime: Date;
    endTime: Date;
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
  createdAt: Date;
  updatedAt: Date;
}

const gameEventSchema = new Schema<IGameEventDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    category: {
      type: String,
      enum: ['raid', 'exp_boost', 'community', 'login_reward', 'pvp_season', 'world_boss', 'maintenance'],
      required: true,
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'],
      default: 'draft',
      required: true,
    },
    schedule: {
      startTime: { type: Date, required: true },
      endTime: { type: Date, required: true },
      timezone: { type: String, default: 'UTC' },
      recurrence: {
        type: String,
        enum: ['none', 'daily', 'weekly', 'monthly'],
        default: 'none',
      },
    },
    targeting: {
      playerSegments: [
        {
          type: String,
          enum: ['all', 'new_players', 'veterans_level_80_plus', 'vip_tier_3', 'guild_leaders', 'dormant_returnees'],
        },
      ],
      serverClusters: [
        {
          type: String,
          enum: ['NA-East', 'EU-Central', 'APAC-East', 'Global', 'Staging-Internal'],
        },
      ],
      minLevel: { type: Number, min: 1, max: 100 },
      maxLevel: { type: Number, min: 1, max: 100 },
    },
    config: {
      expMultiplier: { type: Number, default: 1.0 },
      dropRateBonusPct: { type: Number, default: 0 },
      goldBonusPct: { type: Number, default: 0 },
      specialRules: [{ type: String }],
      bannerAssetUrl: { type: String, default: '' },
    },
    audit: {
      createdBy: { type: String, required: true },
      lastModifiedBy: { type: String, required: true },
      version: { type: Number, default: 1 },
    },
  },
  {
    timestamps: true,
  }
);

gameEventSchema.index({ status: 1, 'schedule.startTime': 1, 'schedule.endTime': 1 });
gameEventSchema.index({ category: 1 });

export const GameEvent = model<IGameEventDocument>('GameEvent', gameEventSchema);
