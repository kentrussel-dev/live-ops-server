import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { ChatMessage } from '../models/ChatMessage';
import { ChatChannel } from '../models/ChatChannel';
import { Notification } from '../models/Notification';
import { User } from '../models/User';

let io: SocketIOServer | null = null;
const onlineUsers = new Map<string, { socketId: string; username: string; role: string }>();

export function initSocketIO(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  // JWT Authentication Middleware for Sockets
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) {
        return next(new Error('Authentication token required.'));
      }

      const decoded: any = jwt.verify(token, ENV.JWT_SECRET);
      socket.data.user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid or expired socket authentication token.'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;
    if (!user) return;

    // Track online user
    onlineUsers.set(user.userId, {
      socketId: socket.id,
      username: user.username,
      role: user.role,
    });

    // Join personal user room
    socket.join(`user:${user.userId}`);
    socket.join(`user:${user.username}`);

    // Broadcast online presence
    io?.emit('presence:update', Array.from(onlineUsers.keys()));

    // Channel Join
    socket.on('channel:join', async (channelId: string) => {
      socket.join(`channel:${channelId}`);

      // Auto-mark messages as seen by this user
      try {
        const now = new Date();
        await ChatMessage.updateMany(
          {
            channelId,
            'sender._id': { $ne: user.userId },
            'seenBy.userId': { $ne: user.userId },
          },
          {
            $set: { status: 'seen' },
            $push: { seenBy: { userId: user.userId, username: user.username, seenAt: now } },
          }
        );

        io?.to(`channel:${channelId}`).emit('chat:messages_seen', {
          channelId,
          seenByUserId: user.userId,
          seenByUsername: user.username,
          seenAt: now,
        });
      } catch (_) {}
    });

    // Channel Leave
    socket.on('channel:leave', (channelId: string) => {
      socket.leave(`channel:${channelId}`);
    });

    // Real-Time Typing Indicator
    socket.on('chat:typing', ({ channelId, isTyping }: { channelId: string; isTyping: boolean }) => {
      socket.to(`channel:${channelId}`).emit('chat:user_typing', {
        channelId,
        username: user.username,
        isTyping,
      });
    });

    // Real-Time Mark Seen
    socket.on('chat:mark_seen', async (channelId: string) => {
      try {
        const now = new Date();
        await ChatMessage.updateMany(
          {
            channelId,
            'sender._id': { $ne: user.userId },
            'seenBy.userId': { $ne: user.userId },
          },
          {
            $set: { status: 'seen' },
            $push: { seenBy: { userId: user.userId, username: user.username, seenAt: now } },
          }
        );

        io?.to(`channel:${channelId}`).emit('chat:messages_seen', {
          channelId,
          seenByUserId: user.userId,
          seenByUsername: user.username,
          seenAt: now,
        });
      } catch (err) {
        console.error('[Socket Seen Error]:', err);
      }
    });

    // Real-Time Send Message
    socket.on(
      'chat:send_message',
      async (
        payload: {
          channelId: string;
          content: string;
          recipientId?: string;
          attachments?: any[];
        },
        callback?: (res: any) => void
      ) => {
        try {
          const { channelId, content, recipientId, attachments } = payload;
          if (!content?.trim() && (!attachments || attachments.length === 0)) {
            if (callback) callback({ success: false, error: 'Message content or attachment required' });
            return;
          }

          const fullUser = await User.findById(user.userId);

          const message = await ChatMessage.create({
            channelId,
            sender: {
              _id: user.userId,
              username: user.username,
              avatarUrl: fullUser?.avatarUrl || '',
              role: user.role,
              department: user.department || fullUser?.department || 'Operations',
            },
            recipientId: recipientId || undefined,
            content: content.trim(),
            status: 'delivered',
            seenBy: [],
            attachments: attachments || [],
            reactions: [],
          });

          // Broadcast to channel room
          io?.to(`channel:${channelId}`).emit('chat:new_message', message);

          // If this is a DM, send notification to recipient
          if (recipientId && recipientId !== user.userId) {
            const notif = await Notification.create({
              recipientId,
              sender: {
                _id: user.userId,
                username: user.username,
                avatarUrl: fullUser?.avatarUrl || '',
              },
              type: 'direct_message',
              title: `Direct message from ${user.username}`,
              message: content.length > 80 ? content.slice(0, 80) + '...' : content,
              entityType: 'channel',
              entityId: channelId,
              isRead: false,
            });

            io?.to(`user:${recipientId}`).emit('notification:new', notif);
          }

          if (callback) callback({ success: true, data: message });
        } catch (err: any) {
          console.error('[Socket Message Error]:', err);
          if (callback) callback({ success: false, error: err.message });
        }
      }
    );

    socket.on('disconnect', () => {
      onlineUsers.delete(user.userId);
      io?.emit('presence:update', Array.from(onlineUsers.keys()));
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

export async function sendNotificationToUser(payload: {
  recipientId: string;
  sender?: { _id: string; username: string; avatarUrl?: string };
  type: 'ticket_assigned' | 'mention' | 'direct_message' | 'system_alert' | 'status_change';
  title: string;
  message: string;
  entityType?: 'issue' | 'channel' | 'event' | 'server';
  entityId?: string;
}) {
  try {
    const notif = await Notification.create({
      recipientId: payload.recipientId,
      sender: payload.sender,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      entityType: payload.entityType,
      entityId: payload.entityId,
      isRead: false,
    });

    if (io) {
      io.to(`user:${payload.recipientId}`).emit('notification:new', notif);
    }
    return notif;
  } catch (err) {
    console.error('[sendNotificationToUser Error]:', err);
    return null;
  }
}
