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

export const updateChannelSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(50).optional(),
    description: z.string().max(200).optional(),
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
            dmTargetUser = await User.findById(otherUserId).select('_id username avatarUrl avatarColor role department');
          }

          const lastMessage = await ChatMessage.findOne({ channelId: c._id }).sort({ createdAt: -1 });

          const channelObj = c.toObject();
          if (!channelObj.color && !channelObj.isDirectMessage) {
            const channelPalette = ['#2563EB', '#7C3AED', '#059669', '#D97706', '#DC2626', '#0891B2', '#4F46E5', '#DB2777', '#0D9488', '#EA580C'];
            let hash = 0;
            for (let i = 0; i < c.name.length; i++) {
              hash = (hash << 5) - hash + c.name.charCodeAt(i);
            }
            channelObj.color = channelPalette[Math.abs(hash) % channelPalette.length];
          }

          return {
            ...channelObj,
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

    const channelPalette = ['#2563EB', '#7C3AED', '#059669', '#D97706', '#DC2626', '#0891B2', '#4F46E5', '#DB2777', '#0D9488', '#EA580C'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash << 5) - hash + name.charCodeAt(i);
    }
    const color = channelPalette[Math.abs(hash) % channelPalette.length];

    const channel = await ChatChannel.create({
      name,
      slug,
      description: description || '',
      isDirectMessage: isDirectMessage || false,
      color,
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

export async function updateChannel(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { channelId } = req.params;
    const { name, description, members } = req.body;
    const channel = await ChatChannel.findById(channelId);

    if (!channel) {
      res.status(404).json({ success: false, error: { message: 'Channel not found' } });
      return;
    }

    if (channel.isDirectMessage) {
      res.status(400).json({ success: false, error: { message: 'Cannot edit direct message channels' } });
      return;
    }

    const currentUsername = req.user?.username;
    const currentUserId = req.user?.userId;
    const isCreator =
      channel.createdBy === currentUsername ||
      channel.createdBy === currentUserId ||
      (channel.members && channel.members.some((m) => m.toString() === currentUserId));
    const isAdmin = req.user?.role === 'admin';

    if (!isCreator && !isAdmin) {
      res.status(403).json({
        success: false,
        error: { message: 'Only the channel creator or an administrator can edit this channel.' },
      });
      return;
    }

    if (name !== undefined && name.trim()) {
      channel.name = name.trim();
      channel.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    if (description !== undefined) {
      channel.description = description.trim();
    }
    if (members !== undefined && Array.isArray(members)) {
      channel.members = members as any;
    }

    await channel.save();

    const io = getIO();
    io?.emit('channel:updated', channel);

    res.json({
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

    const targetUser = await User.findById(targetUserId).select('_id username avatarUrl avatarColor role department');
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
    const { content, attachments, replyTo } = req.body;
    let { recipientId } = req.body;
    const userId = req.user?.userId;
    const currentUserId = userId?.toString();
    const currentUsername = req.user?.username;
    const isAdmin = req.user?.role === 'admin';

    const channelDoc = await ChatChannel.findById(channelId);
    if (!channelDoc) {
      res.status(404).json({ success: false, error: { message: 'Channel not found' } });
      return;
    }

    // Check membership on standard channels if members are specified
    if (!channelDoc.isDirectMessage && channelDoc.members && channelDoc.members.length > 0) {
      const isMember = channelDoc.members.some((m: any) => m?.toString() === currentUserId);
      const isCreator = channelDoc.createdBy === currentUsername || channelDoc.createdBy === currentUserId;
      if (!isMember && !isCreator && !isAdmin) {
        res.status(403).json({ success: false, error: { message: 'You are not a member of this channel.' } });
        return;
      }
    }

    // Check membership on direct message channels
    if (channelDoc.isDirectMessage) {
      const isDmMember = channelDoc.members && channelDoc.members.some((m: any) => m?.toString() === currentUserId);
      if (!isDmMember && !isAdmin) {
        res.status(403).json({ success: false, error: { message: 'You are not a member of this direct message.' } });
        return;
      }
      // Auto-resolve recipientId if not provided
      if (!recipientId && channelDoc.members && channelDoc.members.length > 0) {
        const otherMember = channelDoc.members.find((m: any) => m?.toString() !== currentUserId);
        if (otherMember) {
          recipientId = otherMember.toString();
        }
      }
    }

    const fullUser = await User.findById(userId);

    const message = await ChatMessage.create({
      channelId,
      sender: {
        _id: userId,
        username: req.user?.username || 'Operator',
        avatarUrl: fullUser?.avatarUrl || '',
        avatarColor: fullUser?.avatarColor || '',
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
      io?.to(`user:${recipientId}`).emit('chat:new_message', message);

      try {
        const enrichedChannelForRecipient = {
          ...channelDoc.toObject(),
          dmTargetUser: {
            _id: userId,
            username: req.user?.username || 'Operator',
            avatarUrl: fullUser?.avatarUrl || '',
            avatarColor: fullUser?.avatarColor || '',
            role: req.user?.role || 'liveops_editor',
            department: req.user?.department || fullUser?.department || 'Live Operations',
          },
          lastMessage: {
            content: message.content,
            senderName: req.user?.username || 'Operator',
            createdAt: message.createdAt,
          },
        };
        io?.to(`user:${recipientId}`).emit('chat:dm_channel_created', enrichedChannelForRecipient);
      } catch (dmErr) {
        console.error('[REST DM Channel Emit Error]:', dmErr);
      }
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
