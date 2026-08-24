import { Request, Response, NextFunction } from 'express';
import { ChatChannel } from '../models/ChatChannel';
import { ChatMessage } from '../models/ChatMessage';
import { User } from '../models/User';
import { Notification } from '../models/Notification';
import { getIO } from '../socket';
import { z } from 'zod';

export const createChannelSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(50),
    description: z.string().max(200).optional(),
    isDirectMessage: z.boolean().optional(),
    members: z.array(z.string()).optional(),
  }),
});

export const sendMessageSchema = z.object({
  body: z.object({
    content: z.string().min(1),
    recipientId: z.string().optional(),
    attachments: z
      .array(
        z.object({
          name: z.string(),
          url: z.string(),
          size: z.number(),
          type: z.string(),
        })
      )
      .optional(),
  }),
});

export async function getChannels(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;

    // Purge any accidental self-DMs from the database
    await ChatChannel.deleteMany({
      isDirectMessage: true,
      $or: [
        { members: { $size: 0 } },
        { members: { $size: 1 } },
        { $expr: { $eq: [{ $arrayElemAt: ['$members', 0] }, { $arrayElemAt: ['$members', 1] }] } },
      ],
    });

    // Fetch public channels and legitimate DMs involving the user
    const channels = await ChatChannel.find({
      $or: [
        { isDirectMessage: false },
        { isDirectMessage: true, members: userId },
      ],
    }).sort({ isDirectMessage: 1, name: 1 });

    // Populate DMs with target user profile
    const enrichedChannels = (
      await Promise.all(
        channels.map(async (c) => {
          let dmTargetUser = null;
          if (c.isDirectMessage && c.members.length > 0) {
            const otherUserId = c.members.find((m) => m.toString() !== userId?.toString());
            if (!otherUserId) return null; // Skip self DMs
            dmTargetUser = await User.findById(otherUserId).select('_id username avatarUrl role department');
          }

          const lastMessage = await ChatMessage.findOne({ channelId: c._id }).sort({ createdAt: -1 });

          return {
            ...c.toObject(),
            dmTargetUser,
            lastMessage: lastMessage
              ? {
                  content: lastMessage.content,
                  senderName: lastMessage.sender.username,
                  createdAt: lastMessage.createdAt,
                }
              : undefined,
          };
        })
      )
    ).filter(Boolean);

    res.json({
      success: true,
      data: { channels: enrichedChannels },
    });
  } catch (err) {
    next(err);
  }
}

export async function createChannel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, description, isDirectMessage, members } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const channel = await ChatChannel.create({
      name,
      slug,
      description: description || '',
      isDirectMessage: isDirectMessage || false,
      members: members || [req.user?.userId],
      createdBy: req.user?.username || 'root_admin',
    });

    const io = getIO();
    io?.emit('channel:created', channel);

    res.status(201).json({
      success: true,
      data: { channel },
    });
  } catch (err) {
    next(err);
  }
}

export async function getOrCreateDM(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const currentUserId = req.user?.userId;
    const { targetUserId } = req.params;

    if (!targetUserId) {
      res.status(400).json({ success: false, error: { message: 'Target user ID required' } });
      return;
    }

    if (currentUserId?.toString() === targetUserId?.toString()) {
      res.status(400).json({ success: false, error: { message: 'Cannot create a direct message with yourself' } });
      return;
    }

    const targetUser = await User.findById(targetUserId).select('_id username avatarUrl role department');
    if (!targetUser) {
      res.status(404).json({ success: false, error: { message: 'Target user not found' } });
      return;
    }

    // Check if DM channel already exists between these 2 users
    let channel = await ChatChannel.findOne({
      isDirectMessage: true,
      members: { $all: [currentUserId, targetUserId] },
    });

    if (!channel) {
      channel = await ChatChannel.create({
        name: `DM: ${req.user?.username} & ${targetUser.username}`,
        slug: `dm-${currentUserId}-${targetUserId}`,
        description: `Direct message conversation with ${targetUser.username}`,
        isDirectMessage: true,
        members: [currentUserId, targetUserId],
        createdBy: req.user?.username || 'root_admin',
      });
    }

    res.json({
      success: true,
      data: {
        channel: {
          ...channel.toObject(),
          dmTargetUser: targetUser,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { channelId } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    const messages = await ChatMessage.find({ channelId })
      .sort({ createdAt: 1 })
      .limit(limit);

    res.json({
      success: true,
      data: { messages },
    });
  } catch (err) {
    next(err);
  }
}

export async function sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { channelId } = req.params;
    const { content, recipientId, attachments, replyTo } = req.body;
    const userId = req.user?.userId;

    const fullUser = await User.findById(userId);

    const message = await ChatMessage.create({
      channelId,
      sender: {
        _id: userId,
        username: req.user?.username || 'Operator',
        avatarUrl: fullUser?.avatarUrl || '',
        role: req.user?.role || 'liveops_editor',
        department: req.user?.department || fullUser?.department || 'Operations',
      },
      recipientId: recipientId || undefined,
      content: content.trim(),
      replyTo: replyTo || undefined,
      attachments: attachments || [],
      reactions: [],
    });

    const io = getIO();
    io?.to(`channel:${channelId}`).emit('chat:new_message', message);

    if (recipientId && recipientId !== userId) {
      const notif = await Notification.create({
        recipientId,
        sender: {
          _id: userId,
          username: req.user?.username || 'Operator',
          avatarUrl: fullUser?.avatarUrl || '',
        },
        type: 'direct_message',
        title: `Direct message from ${req.user?.username}`,
        message: content.length > 80 ? content.slice(0, 80) + '...' : content,
        entityType: 'channel',
        entityId: channelId,
        isRead: false,
      });

      io?.to(`user:${recipientId}`).emit('notification:new', notif);
    }

    res.status(201).json({
      success: true,
      data: { message },
    });
  } catch (err) {
    next(err);
  }
}

export async function toggleReaction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { messageId } = req.params;
    const { reaction } = req.body;
    const username = req.user?.username || 'Operator';

    const message = await ChatMessage.findById(messageId);
    if (!message) {
      res.status(404).json({ success: false, error: { message: 'Message not found' } });
      return;
    }

    // Check if the user already reacted with THIS exact emoji
    const alreadyHadThisReaction = message.reactions.some(
      (r) => r.reaction === reaction && r.users.includes(username)
    );

    // Remove user from ALL current reactions on this message (ensures strictly 1 reaction per user)
    message.reactions.forEach((r) => {
      r.users = r.users.filter((u) => u !== username);
    });

    // If they did not already have this reaction, add it (toggles on / replaces previous reaction)
    if (!alreadyHadThisReaction) {
      const targetReaction = message.reactions.find((r) => r.reaction === reaction);
      if (targetReaction) {
        targetReaction.users.push(username);
      } else {
        message.reactions.push({
          reaction,
          users: [username],
        });
      }
    }

    // Clean up any reaction entries that have 0 users left
    message.reactions = message.reactions.filter((r) => r.users.length > 0);

    await message.save();

    const io = getIO();
    io?.to(`channel:${message.channelId}`).emit('chat:reaction_updated', {
      messageId: message._id,
      reactions: message.reactions,
    });

    res.json({
      success: true,
      data: { message },
    });
  } catch (err) {
    next(err);
  }
}
