import express, { Application } from 'express';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';

dotenv.config();

import config from './config';
import { swaggerSpec } from './config/swagger';
import sequelize from './database/connection';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware';
import redisClient from './utils/redis';

// Ensure model associations are initialized
import './models';

const app: Application = express();

// Core middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger documentation - available at /docs
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Sycamore Wallet API Docs',
}));

// Serve raw OpenAPI spec for tooling integration
app.get('/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Development request logger
if (config.nodeEnv === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Mount API routes
app.use('/api', routes);

// Landing page with quick reference
app.get('/', (req, res) => {
  res.json({
    name: 'Sycamore Wallet API',
    version: '1.0.0',
    documentation: '/docs',
    endpoints: {
      health: '/api/health',
      transfer: '/api/transfer',
      wallets: '/api/wallets',
      interest: '/api/interest',
    },
  });
});

// Catch-all handlers
app.use(notFoundHandler);
app.use(errorHandler);

async function startServer(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Redis is optional - the app degrades gracefully without it
    try {
      await redisClient.connect();
    } catch (redisError) {
      console.warn('⚠️  Redis unavailable – distributed locking disabled');
    }

    app.listen(config.port, () => {
      console.log(`🚀 Server running on http://localhost:${config.port}`);
      console.log(`📚 API docs at http://localhost:${config.port}/docs`);
      console.log(`💰 Interest rate: ${config.annualInterestRate * 100}% p.a.`);
    });

  } catch (error) {
    console.error('❌ Startup failed:', error);
    process.exit(1);
  }
}

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`\n${signal} received – shutting down...`);
  await redisClient.disconnect();
  await sequelize.close();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer();

export default app;
