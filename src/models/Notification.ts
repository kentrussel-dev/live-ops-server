import { Schema, model, Document, Types } from 'mongoose';
import { NotificationType } from '../../shared/types';

export interface INotificationDocument extends Document {
  recipientId: Types.ObjectId;
  sender?: {
    _id: Types.ObjectId;
    username: string;
    avatarUrl?: string;
  };
  type: NotificationType;
  title: string;
  message: string;
  entityType?: 'issue' | 'channel' | 'event' | 'server';
  entityId?: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotificationDocument>(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sender: {
      _id: { type: Schema.Types.ObjectId, ref: 'User' },
      username: { type: String },
      avatarUrl: { type: String },
    },
    type: {
      type: String,
      enum: ['ticket_assigned', 'mention', 'direct_message', 'system_alert', 'status_change'],
      required: true,
      default: 'system_alert',
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    entityType: {
      type: String,
      enum: ['issue', 'channel', 'event', 'server'],
    },
    entityId: {
      type: String,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });

export const Notification = model<INotificationDocument>('Notification', notificationSchema);
