import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './docs/swagger';
import { authRouter } from './routes/authRoutes';
import { eventRouter } from './routes/eventRoutes';
import { patchRouter } from './routes/patchRoutes';
import { shopRouter } from './routes/shopRoutes';
import { issueRouter } from './routes/issueRoutes';
import { timelineRouter } from './routes/timelineRoutes';
import { systemRouter } from './routes/systemRoutes';
import { serverRouter } from './routes/serverRoutes';
import { chatRouter } from './routes/chatRoutes';
import { notificationRouter } from './routes/notificationRoutes';
import { errorHandler } from './middleware/errorHandler';

export function createApp() {
  const app = express();

  // Basic security and request parsing
  app.use(helmet({
    contentSecurityPolicy: false, // Allows Swagger UI assets
  }));

  app.use(
    cors({
      origin: true, // Allow frontend dev origins
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));

  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'aetheria-live-ops-api',
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
    });
  });

  // Interactive Swagger UI documentation
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    customSiteTitle: 'Aetheria Live-Ops API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
  }));

  // API v1 REST Routes
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/events', eventRouter);
  app.use('/api/v1/patches', patchRouter);
  app.use('/api/v1/shop-rotations', shopRouter);
  app.use('/api/v1/issues', issueRouter);
  app.use('/api/v1/timeline', timelineRouter);
  app.use('/api/v1/system', systemRouter);
  app.use('/api/v1/servers', serverRouter);
  app.use('/api/v1/chat', chatRouter);
  app.use('/api/v1/notifications', notificationRouter);

  // 404 Route handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'ERR_ENDPOINT_NOT_FOUND',
        message: `Endpoint '${req.method} ${req.originalUrl}' not found on this server. Refer to /api/docs for available routes.`,
      },
    });
  });

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
}
