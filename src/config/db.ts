import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import dns from 'dns';
import { ENV } from './env';

// Ensure cloud SRV records (Atlas) resolve properly across all cloud hosts / Windows dev networks
if (ENV.MONGODB_URI.startsWith('mongodb+srv://')) {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch (e) {
    // Ignore if not permitted
  }
}

let mongoMemoryServer: MongoMemoryServer | null = null;

export async function connectDB(): Promise<typeof mongoose> {
  // If already connected, return
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  try {
    // Attempt connecting to the configured URI with a 10-second timeout
    await mongoose.connect(ENV.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
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
