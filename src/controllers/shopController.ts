import { Request, Response, NextFunction } from 'express';
import { ShopItemRotation } from '../models/ShopItemRotation';
import { AuditLog } from '../models/AuditLog';
import { z } from 'zod';

export const createShopItemSchema = z.object({
  body: z.object({
    itemId: z.string().min(2),
    name: z.string().min(2),
    description: z.string().min(5),
    category: z.enum(['weapon', 'armor', 'consumable', 'cosmetic', 'mount', 'bundle', 'currency']),
    rarity: z.enum(['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic']),
    pricing: z.object({
      basePrice: z.number().min(0),
      currency: z.enum(['gems', 'gold', 'valor_tokens', 'rift_shards']).default('gems'),
      discountPct: z.number().min(0).max(100).default(0),
      salePrice: z.number().min(0),
    }),
    rotationStatus: z.enum(['featured', 'standard', 'flash_sale', 'retired', 'vaulted']).default('standard'),
    schedule: z.object({
      activeFrom: z.string().datetime(),
      activeUntil: z.string().datetime(),
      stockLimitPerUser: z.number().optional(),
      globalStockRemaining: z.number().optional(),
    }),
    previewAssets: z.object({
      iconTag: z.string(),
      modelPreviewTag: z.string().optional(),
      hasParticleEffect: z.boolean().optional(),
      tierGlowHex: z.string().optional(),
    }),
    tags: z.array(z.string()).default([]),
  }),
});

export const updateShopItemSchema = z.object({
  body: createShopItemSchema.shape.body.partial(),
});

export const batchRotateSchema = z.object({
  body: z.object({
    itemIds: z.array(z.string()).min(1),
    newStatus: z.enum(['featured', 'standard', 'flash_sale', 'retired', 'vaulted']),
    discountPct: z.number().min(0).max(100).optional(),
    activeUntil: z.string().datetime().optional(),
    reason: z.string().optional(),
  }),
});

export async function getShopRotations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, category, rarity, search, sort = 'status' } = req.query;
    const filter: Record<string, any> = {};

    if (status) {
      filter.rotationStatus = { $in: String(status).split(',') };
    }

    if (category) {
      filter.category = { $in: String(category).split(',') };
    }

    if (rarity) {
      filter.rarity = { $in: String(rarity).split(',') };
    }

    if (search) {
      const searchRegex = new RegExp(String(search), 'i');
      filter.$or = [{ name: searchRegex }, { itemId: searchRegex }, { description: searchRegex }, { tags: searchRegex }];
    }

    let sortOption: Record<string, any> = { 'schedule.activeUntil': 1 };
    if (sort === 'price_asc') sortOption = { 'pricing.salePrice': 1 };
    if (sort === 'price_desc') sortOption = { 'pricing.salePrice': -1 };
    if (sort === 'rarity') sortOption = { rarity: 1 };
    if (sort === 'created') sortOption = { createdAt: -1 };

    const items = await ShopItemRotation.find(filter).sort(sortOption);

    res.json({
      success: true,
      data: {
        items,
        total: items.length,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getShopItemById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await ShopItemRotation.findById(req.params.id);
    if (!item) {
      res.status(404).json({
        success: false,
        error: { code: 'ERR_ITEM_NOT_FOUND', message: 'Shop item not found.' },
      });
      return;
    }

    res.json({
      success: true,
      data: { item },
    });
  } catch (err) {
    next(err);
  }
}

export async function createShopItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const existing = await ShopItemRotation.findOne({ itemId: req.body.itemId });
    if (existing) {
      res.status(409).json({
        success: false,
        error: { code: 'ERR_ITEM_ID_CONFLICT', message: `Item ID '${req.body.itemId}' already exists in catalog.` },
      });
      return;
    }

    const username = req.user?.username || 'system';
    const newItem = await ShopItemRotation.create({
      ...req.body,
      lastModifiedBy: username,
    });

    await AuditLog.create({
      action: 'SHOP_ITEM_CREATED',
      entityType: 'shop',
      entityId: newItem._id.toString(),
      performedBy: username,
      userRole: req.user?.role || 'liveops_editor',
      details: `Added new shop item '${newItem.name}' (${newItem.itemId}) as ${newItem.rotationStatus}`,
    });

    res.status(201).json({
      success: true,
      data: { item: newItem },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateShopItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await ShopItemRotation.findById(req.params.id);
    if (!item) {
      res.status(404).json({
        success: false,
        error: { code: 'ERR_ITEM_NOT_FOUND', message: 'Shop item not found.' },
      });
      return;
    }

    const username = req.user?.username || 'system';
    Object.assign(item, req.body, { lastModifiedBy: username });
    await item.save();

    await AuditLog.create({
      action: 'SHOP_ITEM_UPDATED',
      entityType: 'shop',
      entityId: item._id.toString(),
      performedBy: username,
      userRole: req.user?.role || 'liveops_editor',
      details: `Updated shop item '${item.name}' status to ${item.rotationStatus}`,
    });

    res.json({
      success: true,
      data: { item },
    });
  } catch (err) {
    next(err);
  }
}

export async function batchRotateItems(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { itemIds, newStatus, discountPct, activeUntil, reason } = req.body;
    const username = req.user?.username || 'system';

    const updateFields: Record<string, any> = {
      rotationStatus: newStatus,
      lastModifiedBy: username,
    };

    if (activeUntil) {
      updateFields['schedule.activeUntil'] = new Date(activeUntil);
    }

    if (discountPct !== undefined) {
      updateFields['pricing.discountPct'] = discountPct;
    }

    const result = await ShopItemRotation.updateMany(
      { itemId: { $in: itemIds } },
      { $set: updateFields }
    );

    // If discount was updated, recalculate salePrice for affected items
    if (discountPct !== undefined) {
      const items = await ShopItemRotation.find({ itemId: { $in: itemIds } });
      for (const item of items) {
        item.pricing.salePrice = Math.round(item.pricing.basePrice * (1 - discountPct / 100));
        await item.save();
      }
    }

    await AuditLog.create({
      action: 'SHOP_BATCH_ROTATION',
      entityType: 'shop',
      performedBy: username,
      userRole: req.user?.role || 'liveops_editor',
      details: `Batch rotated ${result.modifiedCount} items to '${newStatus}'. Reason: ${reason || 'Scheduled operational rotation'}`,
      diffPayload: { itemIds, newStatus, discountPct, activeUntil },
    });

    res.json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount,
        message: `Successfully shifted ${result.modifiedCount} item(s) to '${newStatus}'.`,
      },
    });
  } catch (err) {
    next(err);
  }
}
