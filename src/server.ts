import { createApp } from './app';
import { connectDB } from './config/db';
import { ENV } from './config/env';
import { User } from './models/User';
import { seedDatabase } from './seeds/seed';

async function startServer() {
  try {
    await connectDB();

    // Check if initial admin account setup is required
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('[Server] Database is clean and ready. Awaiting initial administrator / operator registration.');
    }

    const app = createApp();

    const server = app.listen(ENV.PORT, () => {
      console.log(`\n======================================================`);
      console.log(`🚀 AETHERIA LIVE-OPS REST API SERVER READY`);
      console.log(`📡 URL: http://localhost:${ENV.PORT}`);
      console.log(`📖 Swagger Docs: http://localhost:${ENV.PORT}/api/docs`);
      console.log(`🩺 Health check: http://localhost:${ENV.PORT}/api/health`);
      console.log(`======================================================\n`);
    });

    const shutdown = async () => {
      console.log('\n[Server] Gracefully shutting down...');
      server.close(() => {
        console.log('[Server] HTTP listener closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (err) {
    console.error('[Server] Fatal startup error:', err);
    process.exit(1);
  }
}

startServer();
