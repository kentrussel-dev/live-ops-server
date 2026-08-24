import { Router } from 'express';
import {
  getShopRotations,
  getShopItemById,
  createShopItem,
  updateShopItem,
  batchRotateItems,
  createShopItemSchema,
  updateShopItemSchema,
  batchRotateSchema,
} from '../controllers/shopController';
import { authenticateToken, requireRoles } from '../middleware/auth';
import { validateSchema } from '../middleware/validate';

export const shopRouter = Router();

shopRouter.use(authenticateToken);

shopRouter.get('/', getShopRotations);
shopRouter.get('/:id', getShopItemById);

shopRouter.post(
  '/',
  requireRoles('liveops_editor', 'admin'),
  validateSchema(createShopItemSchema),
  createShopItem
);

shopRouter.put(
  '/:id',
  requireRoles('liveops_editor', 'admin'),
  validateSchema(updateShopItemSchema),
  updateShopItem
);

shopRouter.post(
  '/batch-rotate',
  requireRoles('liveops_editor', 'admin'),
  validateSchema(batchRotateSchema),
  batchRotateItems
);
