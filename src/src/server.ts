import dotenv from 'dotenv';
import App from './app';
import { logger } from './config/logger';

/**
 * Server entry point with environment configuration
 * Implements Azure best practices for application startup
 */

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'NODE_ENV',
  'PORT',
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  logger.error('Missing required environment variables:', {
    missing: missingEnvVars,
  });
  process.exit(1);
}

// Global unhandled error handlers
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown, promise: Promise<any>) => {
  logger.error('Unhandled Rejection:', {
    reason,
    promise,
  });
  process.exit(1);
});

// Create and start the application
const app = new App();

logger.info('Starting NR Permitting API...', {
  nodeVersion: process.version,
  environment: process.env.NODE_ENV,
  port: process.env.PORT,
});

app.start().catch((error) => {
  logger.error('Failed to start application:', error);
  process.exit(1);
});
