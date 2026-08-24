import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { UserRole } from '../../shared/types';

export interface AuthenticatedUserPayload {
  userId: string;
  username: string;
  email: string;
  role: UserRole;
  department: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUserPayload;
    }
  }
}

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        code: 'ERR_UNAUTHORIZED',
        message: 'Authentication token required.',
      },
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as AuthenticatedUserPayload;
    req.user = decoded;
    next();
  } catch (err: any) {
    res.status(401).json({
      success: false,
      error: {
        code: 'ERR_INVALID_TOKEN',
        message: 'Authentication token is invalid or has expired.',
      },
    });
  }
}

export function requireRoles(...allowedRoles: (UserRole | UserRole[])[]) {
  const flattened = allowedRoles.flat();
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'ERR_UNAUTHORIZED',
          message: 'Authentication required.',
        },
      });
      return;
    }

    if (!flattened.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'ERR_FORBIDDEN_ROLE',
          message: `Action requires one of the following roles: ${flattened.join(', ')}. Current role: '${req.user.role}'.`,
        },
      });
      return;
    }

    next();
  };
}
