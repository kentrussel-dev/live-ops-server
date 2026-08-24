import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { AuditLog } from '../models/AuditLog';
import { ENV } from '../config/env';
import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6),
  }),
});

export const masterKeySchema = z.object({
  body: z.object({
    masterKey: z.string().min(1, 'Master key is required'),
    username: z.string().min(3).max(30),
    email: z.string().email(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }),
});

export const createUserSchema = z.object({
  body: z.object({
    username: z.string().min(3).max(30),
    email: z.string().email(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.enum(['admin', 'liveops_editor', 'readonly_viewer']),
    department: z.string().min(1, 'Department is required'),
  }),
});

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'ERR_INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
        },
      });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        error: {
          code: 'ERR_INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
        },
      });
      return;
    }

    user.lastLoginAt = new Date();
    await user.save();

    const payload = {
      userId: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      department: user.department,
    };

    const token = jwt.sign(payload, ENV.JWT_SECRET, {
      expiresIn: ENV.JWT_EXPIRES_IN as any,
    });

    await AuditLog.create({
      action: 'USER_LOGIN',
      entityType: 'auth',
      entityId: user._id.toString(),
      performedBy: user.username,
      userRole: user.role,
      details: `Operator ${user.username} authenticated session successfully.`,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          department: user.department,
          avatarUrl: user.avatarUrl,
          lastLoginAt: user.lastLoginAt,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function bootstrapWithMasterKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { masterKey, username, email, password } = req.body;

    if (masterKey !== ENV.ROOT_ADMIN_KEY) {
      res.status(403).json({
        success: false,
        error: {
          code: 'ERR_INVALID_MASTER_KEY',
          message: 'Invalid Master Root Key provided.',
        },
      });
      return;
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    let user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      user.username = username;
      user.passwordHash = passwordHash;
      user.role = 'admin';
      user.department = 'Studio Leadership';
      user.lastLoginAt = new Date();
      await user.save();
    } else {
      user = new User({
        username,
        email: email.toLowerCase(),
        passwordHash,
        role: 'admin',
        department: 'Studio Leadership',
        lastLoginAt: new Date(),
      });
      await user.save();
    }

    const payload = {
      userId: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      department: user.department,
    };

    const token = jwt.sign(payload, ENV.JWT_SECRET, {
      expiresIn: ENV.JWT_EXPIRES_IN as any,
    });

    await AuditLog.create({
      action: 'ROOT_ADMIN_INITIALIZED',
      entityType: 'auth',
      entityId: user._id.toString(),
      performedBy: user.username,
      userRole: 'admin',
      details: `Root Administrator account established via Master Key.`,
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          _id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          department: user.department,
          avatarUrl: user.avatarUrl,
          lastLoginAt: user.lastLoginAt,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getCurrentUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'ERR_UNAUTHORIZED', message: 'Not authenticated' },
      });
      return;
    }

    const user = await User.findById(req.user.userId).select('-passwordHash');
    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: 'ERR_USER_NOT_FOUND', message: 'User record no longer exists.' },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        user,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
    res.json({
      success: true,
      data: {
        users,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { username, email, password, role, department } = req.body;

    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      res.status(409).json({
        success: false,
        error: {
          code: 'ERR_EMAIL_EXISTS',
          message: 'An operator with this email address already exists.',
        },
      });
      return;
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      res.status(409).json({
        success: false,
        error: {
          code: 'ERR_USERNAME_EXISTS',
          message: 'Username is already in use.',
        },
      });
      return;
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new User({
      username,
      email: email.toLowerCase(),
      passwordHash,
      role,
      department,
      lastLoginAt: new Date(),
    });

    await newUser.save();

    await AuditLog.create({
      action: 'OPERATOR_CREATED',
      entityType: 'auth',
      entityId: newUser._id.toString(),
      performedBy: req.user?.username || 'Admin',
      userRole: req.user?.role || 'admin',
      details: `Created new operator account: ${newUser.username} (${newUser.role}, ${newUser.department}).`,
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          _id: newUser._id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
          department: newUser.department,
          avatarUrl: newUser.avatarUrl,
          createdAt: newUser.createdAt,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    if (req.user?.userId === id) {
      res.status(400).json({
        success: false,
        error: {
          code: 'ERR_CANNOT_DELETE_SELF',
          message: 'Administrators cannot delete their own active account.',
        },
      });
      return;
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: 'ERR_USER_NOT_FOUND', message: 'Operator not found.' },
      });
      return;
    }

    await AuditLog.create({
      action: 'OPERATOR_REVOKED',
      entityType: 'auth',
      entityId: id,
      performedBy: req.user?.username || 'Admin',
      userRole: req.user?.role || 'admin',
      details: `Revoked access for operator ${user.username} (${user.email}).`,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      data: {
        message: `Operator ${user.username} has been removed.`,
      },
    });
  } catch (err) {
    next(err);
  }
}
