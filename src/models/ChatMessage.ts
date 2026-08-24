import { Schema, model, Document, Types } from 'mongoose';
import { UserRole } from '../../shared/types';

export interface IChatMessageDocument extends Document {
  channelId: Types.ObjectId;
  sender: {
    _id: Types.ObjectId;
    username: string;
    avatarUrl?: string;
    role: UserRole;
    department?: string;
  };
  recipientId?: Types.ObjectId;
  content: string;
  replyTo?: {
    messageId?: string;
    senderName?: string;
    senderAvatarUrl?: string;
    content?: string;
  };
  status: 'delivered' | 'seen';
  seenBy: Array<{
    userId: Types.ObjectId;
    username?: string;
    seenAt: Date;
  }>;
  attachments: Array<{
    name: string;
    url: string;
    size: number;
    type: string;
  }>;
  reactions: Array<{
    reaction: string;
    users: string[];
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const chatMessageSchema = new Schema<IChatMessageDocument>(
  {
    channelId: {
      type: Schema.Types.ObjectId,
      ref: 'ChatChannel',
      required: true,
      index: true,
    },
    sender: {
      _id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
      username: { type: String, required: true },
      avatarUrl: { type: String },
      role: { type: String, enum: ['admin', 'liveops_editor', 'readonly_viewer'], required: true },
      department: { type: String },
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    replyTo: {
      messageId: { type: String },
      senderName: { type: String },
      senderAvatarUrl: { type: String },
      content: { type: String },
    },
    status: {
      type: String,
      enum: ['delivered', 'seen'],
      default: 'delivered',
    },
    seenBy: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        username: { type: String },
        seenAt: { type: Date, default: Date.now },
      },
    ],
    attachments: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        size: { type: Number, required: true },
        type: { type: String, required: true },
      },
    ],
    reactions: [
      {
        reaction: { type: String, required: true },
        users: [{ type: String }],
      },
    ],
  },
  {
    timestamps: true,
  }
);

chatMessageSchema.index({ channelId: 1, createdAt: 1 });

export const ChatMessage = model<IChatMessageDocument>('ChatMessage', chatMessageSchema);
