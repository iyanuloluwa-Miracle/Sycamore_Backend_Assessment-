import express, { Application } from 'express';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import config from './config';
import sequelize from './database/connection';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware';
import redisClient from './utils/redis';

// Import models to ensure associations are set up
import './models';

const app: Application = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (config.nodeEnv === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// API Routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Sycamore Backend Assessment API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      transfer: '/api/transfer',
      wallets: '/api/wallets',
      interest: '/api/interest',
    },
  });
});

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
async function startServer(): Promise<void> {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Connect to Redis
    try {
      await redisClient.connect();
    } catch (redisError) {
      console.warn('⚠️ Redis connection failed, continuing without distributed locking');
    }

    // Start Express server
    app.listen(config.port, () => {
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`📍 Environment: ${config.nodeEnv}`);
      console.log(`💰 Interest Rate: ${config.annualInterestRate * 100}% per annum`);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await redisClient.disconnect();
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  await redisClient.disconnect();
  await sequelize.close();
  process.exit(0);
});

// Start the server
startServer();

export default app;
