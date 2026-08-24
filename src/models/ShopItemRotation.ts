import { Schema, model, Document } from 'mongoose';
import { ItemCategory, ItemRarity, RotationStatus, CurrencyType } from '../../shared/types';

export interface IShopItemRotationDocument extends Document {
  itemId: string;
  name: string;
  description: string;
  category: ItemCategory;
  rarity: ItemRarity;
  pricing: {
    basePrice: number;
    currency: CurrencyType;
    discountPct: number;
    salePrice: number;
  };
  rotationStatus: RotationStatus;
  schedule: {
    activeFrom: Date;
    activeUntil: Date;
    stockLimitPerUser?: number;
    globalStockRemaining?: number;
  };
  previewAssets: {
    iconTag: string;
    modelPreviewTag?: string;
    hasParticleEffect?: boolean;
    tierGlowHex?: string;
  };
  tags: string[];
  lastModifiedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const shopItemRotationSchema = new Schema<IShopItemRotationDocument>(
  {
    itemId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['weapon', 'armor', 'consumable', 'cosmetic', 'mount', 'bundle', 'currency'],
      required: true,
    },
    rarity: {
      type: String,
      enum: ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'],
      required: true,
    },
    pricing: {
      basePrice: { type: Number, required: true, min: 0 },
      currency: {
        type: String,
        enum: ['gems', 'gold', 'valor_tokens', 'rift_shards'],
        default: 'gems',
        required: true,
      },
      discountPct: { type: Number, default: 0, min: 0, max: 100 },
      salePrice: { type: Number, required: true, min: 0 },
    },
    rotationStatus: {
      type: String,
      enum: ['featured', 'standard', 'flash_sale', 'retired', 'vaulted'],
      default: 'standard',
      required: true,
    },
    schedule: {
      activeFrom: { type: Date, required: true },
      activeUntil: { type: Date, required: true },
      stockLimitPerUser: { type: Number, min: 0 },
      globalStockRemaining: { type: Number, min: 0 },
    },
    previewAssets: {
      iconTag: { type: String, required: true },
      modelPreviewTag: { type: String, default: '' },
      hasParticleEffect: { type: Boolean, default: false },
      tierGlowHex: { type: String, default: '#64748b' },
    },
    tags: [{ type: String }],
    lastModifiedBy: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

shopItemRotationSchema.index({ rotationStatus: 1, 'schedule.activeFrom': 1, 'schedule.activeUntil': 1 });
shopItemRotationSchema.index({ category: 1, rarity: 1 });

export const ShopItemRotation = model<IShopItemRotationDocument>('ShopItemRotation', shopItemRotationSchema);
