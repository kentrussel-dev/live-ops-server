import { Request, Response, NextFunction } from 'express';
import { Notification } from '../models/Notification';

export async function getNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    const { unreadOnly, type, limit = 50 } = req.query;

    const filter: any = { recipientId: userId };
    if (unreadOnly === 'true') {
      filter.isRead = false;
    }
    if (type) {
      filter.type = type;
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    const unreadCount = await Notification.countDocuments({ recipientId: userId, isRead: false });

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    const unreadCount = await Notification.countDocuments({ recipientId: userId, isRead: false });

    res.json({
      success: true,
      data: { unreadCount },
    });
  } catch (err) {
    next(err);
  }
}

export async function markAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipientId: userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      res.status(404).json({ success: false, error: { message: 'Notification not found' } });
      return;
    }

    const unreadCount = await Notification.countDocuments({ recipientId: userId, isRead: false });

    res.json({
      success: true,
      data: { notification, unreadCount },
    });
  } catch (err) {
    next(err);
  }
}

export async function markAllAsRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;

    await Notification.updateMany({ recipientId: userId, isRead: false }, { isRead: true });

    res.json({
      success: true,
      data: { message: 'All notifications marked as read', unreadCount: 0 },
    });
  } catch (err) {
    next(err);
  }
}
