import { Schema, model, Document } from 'mongoose';
import { ServerNodeStatus, ServerRegion } from '../../shared/types';

export interface IGameServerDocument extends Document {
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
  lastHeartbeat: Date;
  createdAt: Date;
  updatedAt: Date;
}

const gameServerSchema = new Schema<IGameServerDocument>(
  {
    serverId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    host: {
      type: String,
      required: true,
      trim: true,
      default: '127.0.0.1:7777',
    },
    region: {
      type: String,
      enum: ['US-East', 'US-West', 'EU-Central', 'EU-West', 'AP-East', 'AP-South', 'SA-East'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['online', 'high_load', 'draining', 'maintenance', 'offline'],
      default: 'online',
      required: true,
      index: true,
    },
    currentPlayers: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxPlayers: {
      type: Number,
      default: 5000,
      min: 100,
    },
    pingMs: {
      type: Number,
      default: 20,
      min: 0,
    },
    tickRateHz: {
      type: Number,
      default: 60.0,
      min: 0,
      max: 128,
    },
    cpuUsagePct: {
      type: Number,
      default: 45.0,
      min: 0,
      max: 100,
    },
    memoryUsagePct: {
      type: Number,
      default: 50.0,
      min: 0,
      max: 100,
    },
    bandwidthMbps: {
      type: Number,
      default: 250,
      min: 0,
    },
    lockedForLogins: {
      type: Boolean,
      default: false,
    },
    uptimeSeconds: {
      type: Number,
      default: 3600,
    },
    lastHeartbeat: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'game_servers',
  }
);

export const GameServer = model<IGameServerDocument>('GameServer', gameServerSchema);
