import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/live_ops_console',
  JWT_SECRET: process.env.JWT_SECRET || 'aetheria_liveops_super_secret_jwt_key_2026_x89f',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '30d',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  ENABLE_MEMORY_DB_FALLBACK: process.env.ENABLE_MEMORY_DB_FALLBACK !== 'false',
  ROOT_ADMIN_KEY: process.env.ROOT_ADMIN_KEY || 'AetheriaRootSecret2026!',
};
