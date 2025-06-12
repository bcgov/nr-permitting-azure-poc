import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { v4 as uuidv4 } from 'uuid';

import { logger, morganStream } from './config/logger';
import { databaseConfig } from './config/database';
import { swaggerSpec } from './config/swagger';
import { recordRoutes } from './routes/records';
import { healthRoutes } from './routes/health';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

/**
 * Express application setup with Azure best practices
 * Implements security, monitoring, and performance optimizations
 */
class App {
  public app: Application;
  private readonly port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3000');
    
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * Initialize middleware stack with security and performance optimizations
   */
  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }));

    // CORS configuration for Azure API Management
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://api.nr-permitting.gov', 'https://portal.azure.com']
        : true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Ocp-Apim-Subscription-Key',
        'X-Request-ID',
      ],
    }));

    // Compression for better performance
    this.app.use(compression());

    // Request parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request ID middleware for tracing
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const requestId = req.headers['x-request-id'] as string || uuidv4();
      (req as any).requestId = requestId;
      res.setHeader('X-Request-ID', requestId);
      next();
    });

    // HTTP request logging
    this.app.use(morgan('combined', { stream: morganStream }));

    // Rate limiting for API protection
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
      message: {
        error: 'TooManyRequestsError',
        message: 'Too many requests from this IP, please try again later',
        timestamp: new Date().toISOString(),
      },
      standardHeaders: true,
      legacyHeaders: false,
      // Skip rate limiting for health checks
      skip: (req: Request) => {
        return req.path.startsWith('/health') || 
               req.path.startsWith('/liveness') || 
               req.path.startsWith('/readiness');
      },
    });

    this.app.use(limiter);

    // Trust proxy headers (important for Azure deployments)
    this.app.set('trust proxy', 1);
  }

  /**
   * Initialize API routes and documentation
   */
  private initializeRoutes(): void {
    // Root endpoint
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        name: 'NR Permitting API',
        version: process.env.API_VERSION || '1.0.0',
        description: 'Natural Resources Permitting API with Azure Integration',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        documentation: '/api-docs',
        health: '/health',
      });
    });

    // API documentation
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'NR Permitting API Documentation',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        defaultModelExpandDepth: 2,
        defaultModelRendering: 'model',
        docExpansion: 'list',
      },
    }));

    // OpenAPI spec endpoint for Azure API Management import
    this.app.get('/openapi.json', (req: Request, res: Response) => {
      res.setHeader('Content-Type', 'application/json');
      res.json(swaggerSpec);
    });

    // Health check routes (no API prefix for easier monitoring)
    this.app.use('/health', healthRoutes);
    this.app.use('/liveness', healthRoutes);
    this.app.use('/readiness', healthRoutes);

    // API routes with versioning
    const apiPrefix = `/api/${process.env.API_VERSION || 'v1'}`;
    this.app.use(`${apiPrefix}/records`, recordRoutes);
    this.app.use(`${apiPrefix}/health`, healthRoutes);
  }

  /**
   * Initialize error handling middleware
   */
  private initializeErrorHandling(): void {
    // 404 handler for undefined routes
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  /**
   * Start the server with graceful shutdown handling
   */
  public async start(): Promise<void> {
    try {
      // Initialize database connection
      logger.info('Initializing database connection...');
      await databaseConfig.initialize();

      // Start the HTTP server
      const server = this.app.listen(this.port, () => {
        logger.info(`🚀 NR Permitting API started successfully`, {
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          version: process.env.API_VERSION || '1.0.0',
          documentation: `http://localhost:${this.port}/api-docs`,
          openapi: `http://localhost:${this.port}/openapi.json`,
        });
      });

      // Graceful shutdown handling
      process.on('SIGTERM', () => this.gracefulShutdown(server));
      process.on('SIGINT', () => this.gracefulShutdown(server));

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown handler
   */
  private async gracefulShutdown(server: any): Promise<void> {
    logger.info('Received shutdown signal, starting graceful shutdown...');

    // Stop accepting new connections
    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        // Close database connections
        await databaseConfig.close();
        logger.info('Database connections closed');

        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 30000);
  }
}

export default App;
