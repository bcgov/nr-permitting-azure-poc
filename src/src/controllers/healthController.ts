import { Request, Response } from 'express';
import { databaseConfig } from '../config/database';
import { logger } from '../config/logger';
import { HealthResponse } from '../types/database';
import { asyncHandler } from '../middleware/errorHandler';

/**
 * Health check controller for monitoring and Azure API Management integration
 */
export class HealthController {
  /**
   * @swagger
   * /health:
   *   get:
   *     summary: Health check endpoint
   *     description: Returns the current health status of the API and its dependencies. Used for monitoring and Azure API Management health probes.
   *     tags:
   *       - Health
   *     parameters:
   *       - name: detailed
   *         in: query
   *         required: false
   *         schema:
   *           type: boolean
   *           default: false
   *         description: Include detailed health information
   *     responses:
   *       200:
   *         description: Service is healthy
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/HealthResponse'
   *             example:
   *               status: "healthy"
   *               timestamp: "2024-01-15T10:30:00.123Z"
   *               version: "1.0.0"
   *               database:
   *                 connected: true
   *                 latency_ms: 25
   *               environment: "development"
   *       503:
   *         description: Service is unhealthy
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/HealthResponse'
   *             example:
   *               status: "unhealthy"
   *               timestamp: "2024-01-15T10:30:00.123Z"
   *               version: "1.0.0"
   *               database:
   *                 connected: false
   *               environment: "development"
   */
  public healthCheck = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const requestId = (req as any).requestId || 'unknown';
    const detailed = req.query.detailed === 'true';

    logger.debug('Health check requested', {
      requestId,
      detailed,
    });

    try {
      // Check database connectivity
      const databaseHealth = await databaseConfig.testConnection();

      // Determine overall health status
      const isHealthy = databaseHealth.connected;
      const status = isHealthy ? 'healthy' : 'unhealthy';

      // Prepare health response
      const healthResponse: HealthResponse = {
        status,
        timestamp: new Date().toISOString(),
        version: process.env.API_VERSION || '1.0.0',
        database: databaseHealth,
        environment: process.env.NODE_ENV || 'development',
      };

      // Add detailed information if requested
      if (detailed) {
        // Could add more detailed checks here:
        // - Memory usage
        // - CPU usage
        // - External service dependencies
        // - Cache status, etc.
      }

      const statusCode = isHealthy ? 200 : 503;

      logger.info('Health check completed', {
        requestId,
        status,
        databaseConnected: databaseHealth.connected,
        databaseLatency: databaseHealth.latency_ms,
      });

      res.status(statusCode).json(healthResponse);

    } catch (error) {
      logger.error('Health check failed', {
        requestId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Return unhealthy status
      const healthResponse: HealthResponse = {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: process.env.API_VERSION || '1.0.0',
        database: {
          connected: false,
        },
        environment: process.env.NODE_ENV || 'development',
      };

      res.status(503).json(healthResponse);
    }
  });

  /**
   * @swagger
   * /liveness:
   *   get:
   *     summary: Liveness probe endpoint
   *     description: Simple liveness check for Kubernetes/container orchestration. Returns 200 if the service is running.
   *     tags:
   *       - Health
   *     responses:
   *       200:
   *         description: Service is alive
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: "alive"
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   */
  public livenessProbe = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Simple liveness check - just return 200 if the service is running
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * @swagger
   * /readiness:
   *   get:
   *     summary: Readiness probe endpoint
   *     description: Readiness check for Kubernetes/container orchestration. Returns 200 if the service is ready to accept traffic.
   *     tags:
   *       - Health
   *     responses:
   *       200:
   *         description: Service is ready
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: "ready"
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *       503:
   *         description: Service is not ready
   */
  public readinessProbe = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      // Check if essential services are available
      const databaseHealth = await databaseConfig.testConnection();

      if (databaseHealth.connected) {
        res.status(200).json({
          status: 'ready',
          timestamp: new Date().toISOString(),
        });
      } else {
        res.status(503).json({
          status: 'not_ready',
          reason: 'database_unavailable',
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      res.status(503).json({
        status: 'not_ready',
        reason: 'health_check_failed',
        timestamp: new Date().toISOString(),
      });
    }
  });
}

// Export controller instance
export const healthController = new HealthController();
