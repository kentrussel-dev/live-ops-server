import { Schema, model, Document, Types } from 'mongoose';

export interface IChatChannelDocument extends Document {
  name: string;
  slug: string;
  description?: string;
  isDirectMessage: boolean;
  members: Types.ObjectId[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const chatChannelSchema = new Schema<IChatChannelDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    isDirectMessage: {
      type: Boolean,
      default: false,
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    createdBy: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

chatChannelSchema.index({ isDirectMessage: 1, slug: 1 });
chatChannelSchema.index({ members: 1 });

export const ChatChannel = model<IChatChannelDocument>('ChatChannel', chatChannelSchema);
