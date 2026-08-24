import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User';
import { GameEvent } from '../models/GameEvent';
import { PatchNote } from '../models/PatchNote';
import { ShopItemRotation } from '../models/ShopItemRotation';
import { IssueTicket } from '../models/IssueTicket';
import { AuditLog } from '../models/AuditLog';
import { GameServer } from '../models/GameServer';

export async function clearAllData() {
  console.log('[CleanDB] Connecting to database to clear all collections...');
  await connectDB();

  await Promise.all([
    User.deleteMany({}),
    GameEvent.deleteMany({}),
    PatchNote.deleteMany({}),
    ShopItemRotation.deleteMany({}),
    IssueTicket.deleteMany({}),
    AuditLog.deleteMany({}),
    GameServer.deleteMany({}),
  ]);

  console.log('[CleanDB] Successfully cleared all database collections. Database is now 100% clean and empty.');
}

if (require.main === module) {
  clearAllData()
    .then(async () => {
      await disconnectDB();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[CleanDB Error]:', err);
      await disconnectDB();
      process.exit(1);
    });
}
