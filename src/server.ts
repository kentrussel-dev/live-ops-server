import http from 'http';
import { createApp } from './app';
import { connectDB } from './config/db';
import { ENV } from './config/env';
import { User } from './models/User';
import { initSocketIO } from './socket';

async function startServer() {
  try {
    await connectDB();

    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('[Server] Database is clean and ready. Awaiting initial administrator / operator registration.');
    }

    const app = createApp();
    const httpServer = http.createServer(app);

    // Attach Socket.IO for real-time channels, DMs, and notifications
    initSocketIO(httpServer);

    httpServer.listen(ENV.PORT, () => {
      console.log(`\n======================================================`);
      console.log(`🚀 AETHERIA LIVE-OPS REST API & WEBSOCKET SERVER READY`);
      console.log(`📡 URL: http://localhost:${ENV.PORT}`);
      console.log(`💬 Real-Time Discuss Hub: Socket.IO initialized`);
      console.log(`📖 Swagger Docs: http://localhost:${ENV.PORT}/api/docs`);
      console.log(`🩺 Health check: http://localhost:${ENV.PORT}/api/health`);
      console.log(`======================================================\n`);
    });

    const shutdown = async () => {
      console.log('\n[Server] Gracefully shutting down...');
      httpServer.close(() => {
        console.log('[Server] HTTP and Socket listener closed.');
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
