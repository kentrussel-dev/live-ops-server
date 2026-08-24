import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  login,
  bootstrapWithMasterKey,
  getCurrentUser,
  getUsers,
  createUser,
  deleteUser,
  loginSchema,
  masterKeySchema,
  createUserSchema,
} from '../controllers/authController';
import { authenticateToken, requireRoles } from '../middleware/auth';
import { validateSchema } from '../middleware/validate';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: {
      code: 'ERR_RATE_LIMITED',
      message: 'Too many authentication attempts. Please try again in 15 minutes.',
    },
  },
});

export const authRouter = Router();

authRouter.post('/login', authLimiter, validateSchema(loginSchema), login);
authRouter.post('/master-bootstrap', authLimiter, validateSchema(masterKeySchema), bootstrapWithMasterKey);
authRouter.get('/me', authenticateToken, getCurrentUser);

// Admin-only User Management
authRouter.get('/users', authenticateToken, requireRoles(['admin']), getUsers);
authRouter.post('/users', authenticateToken, requireRoles(['admin']), validateSchema(createUserSchema), createUser);
authRouter.delete('/users/:id', authenticateToken, requireRoles(['admin']), deleteUser);
