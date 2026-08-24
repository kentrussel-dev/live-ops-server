import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ENV } from './env';

let mongoMemoryServer: MongoMemoryServer | null = null;

export async function connectDB(): Promise<typeof mongoose> {
  // If already connected, return
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  try {
    // Attempt connecting to the configured URI with a 2-second timeout
    await mongoose.connect(ENV.MONGODB_URI, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log(`[Database] Connected to external MongoDB at ${ENV.MONGODB_URI}`);
    return mongoose;
  } catch (err: any) {
    if (ENV.ENABLE_MEMORY_DB_FALLBACK) {
      console.warn(`[Database] External MongoDB connection failed (${err.message}). Initializing embedded in-memory MongoDB...`);
      mongoMemoryServer = await MongoMemoryServer.create();
      const memoryUri = mongoMemoryServer.getUri();
      await mongoose.connect(memoryUri);
      console.log(`[Database] Connected to in-memory MongoDB at ${memoryUri}`);
      return mongoose;
    } else {
      console.error('[Database] Failed to connect to MongoDB and memory fallback is disabled:', err);
      throw err;
    }
  }
}

export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
    mongoMemoryServer = null;
  }
}
