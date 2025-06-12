import { DefaultAzureCredential, ManagedIdentityCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';
import { Pool, PoolConfig } from 'pg';
import { Kysely, PostgresDialect } from 'kysely';
import { Database } from '../types/database';
import { logger } from './logger';

/**
 * Database configuration class with Azure Key Vault integration
 * Follows Azure best practices for secure credential management
 */
class DatabaseConfig {
  private static instance: DatabaseConfig;
  private pool: Pool | null = null;
  private db: Kysely<Database> | null = null;
  private secretClient: SecretClient | null = null;

  private constructor() {}

  public static getInstance(): DatabaseConfig {
    if (!DatabaseConfig.instance) {
      DatabaseConfig.instance = new DatabaseConfig();
    }
    return DatabaseConfig.instance;
  }

  /**
   * Initialize Azure Key Vault client for secure credential management
   * Uses Managed Identity in production, DefaultAzureCredential for development
   */
  private async initializeKeyVault(): Promise<void> {
    try {
      const keyVaultUrl = process.env.KEY_VAULT_URL;
      if (!keyVaultUrl || keyVaultUrl.includes('placeholder')) {
        logger.warn('KEY_VAULT_URL not provided or is placeholder, using environment variables for database config');
        return;
      }

      // Use Managed Identity in Azure, fallback to DefaultAzureCredential for local development
      const credential = process.env.NODE_ENV === 'production' 
        ? new ManagedIdentityCredential()
        : new DefaultAzureCredential();

      this.secretClient = new SecretClient(keyVaultUrl, credential);
      logger.info('Azure Key Vault client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Key Vault client:', error);
      logger.warn('Falling back to environment variables for database configuration');
    }
  }

  /**
   * Retrieve database configuration from Key Vault or environment variables
   * Implements proper error handling and secure fallback mechanisms
   */
  private async getDatabaseConfig(): Promise<PoolConfig> {
    try {
      let dbConfig: PoolConfig;

      if (this.secretClient) {
        // Retrieve from Key Vault (production)
        logger.info('Retrieving database configuration from Key Vault');
        
        const [host, port, database, user, password] = await Promise.all([
          this.secretClient.getSecret('db-host'),
          this.secretClient.getSecret('db-port'),
          this.secretClient.getSecret('db-name'),
          this.secretClient.getSecret('db-user'),
          this.secretClient.getSecret('db-password')
        ]);

        dbConfig = {
          host: host.value,
          port: parseInt(port.value || '5432'),
          database: database.value,
          user: user.value,
          password: password.value,
          ssl: { rejectUnauthorized: false }, // Azure PostgreSQL requires SSL
        };
      } else {
        // Fallback to environment variables (development)
        logger.info('Using environment variables for database configuration');
        
        dbConfig = {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          database: process.env.DB_NAME || 'nr_permitting',
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          ssl: process.env.DB_SSL_MODE === 'require' ? { 
            rejectUnauthorized: false 
          } : (process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false),
          connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '60000'),
        };
      }

      // Validate required configuration
      if (!dbConfig.host || !dbConfig.user || !dbConfig.password || !dbConfig.database) {
        throw new Error('Missing required database configuration');
      }

      return {
        ...dbConfig,
        // Connection pool configuration for optimal performance
        max: parseInt(process.env.DB_POOL_MAX || '20'), // Maximum number of connections in the pool
        min: parseInt(process.env.DB_POOL_MIN || '5'),  // Minimum number of connections in the pool
        idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '60000'), // Connection timeout
        statement_timeout: 30000, // Query timeout
        query_timeout: 30000,
        // Enable keep-alive for long-running connections
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
        // Additional PostgreSQL-specific settings for Azure
        application_name: 'nr-permitting-api',
        // Ensure proper SSL handling for Azure PostgreSQL Flexible Server
        ssl: dbConfig.ssl || { 
          rejectUnauthorized: false 
        },
      };
    } catch (error) {
      logger.error('Failed to retrieve database configuration:', error);
      throw new Error('Database configuration retrieval failed');
    }
  }

  /**
   * Initialize database connection with retry logic and proper error handling
   */
  public async initialize(): Promise<void> {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        attempt++;
        logger.info(`Initializing database connection (attempt ${attempt}/${maxRetries})`);

        // Initialize Key Vault if not already done
        if (!this.secretClient && process.env.KEY_VAULT_URL && !process.env.KEY_VAULT_URL.includes('placeholder')) {
          await this.initializeKeyVault();
        }

        // Get database configuration
        const dbConfig = await this.getDatabaseConfig();

        // Create connection pool
        this.pool = new Pool(dbConfig);

        // Test the connection
        const client = await this.pool.connect();
        await client.query('SELECT 1');
        client.release();

        // Create Kysely instance
        this.db = new Kysely<Database>({
          dialect: new PostgresDialect({
            pool: this.pool,
          }),
        });

        logger.info('Database connection initialized successfully');
        return;

      } catch (error) {
        logger.error(`Database initialization attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries) {
          throw new Error(`Failed to initialize database after ${maxRetries} attempts`);
        }
        
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        logger.info(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Get Kysely database instance
   */
  public getDatabase(): Kysely<Database> {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Get raw connection pool for advanced operations
   */
  public getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database pool not initialized. Call initialize() first.');
    }
    return this.pool;
  }

  /**
   * Test database connectivity with latency measurement
   */
  public async testConnection(): Promise<{ connected: boolean; latency_ms?: number }> {
    try {
      if (!this.pool) {
        return { connected: false };
      }

      const start = Date.now();
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      const latency_ms = Date.now() - start;

      return { connected: true, latency_ms };
    } catch (error) {
      logger.error('Database connection test failed:', error);
      return { connected: false };
    }
  }

  /**
   * Close database connections gracefully
   */
  public async close(): Promise<void> {
    try {
      if (this.db) {
        await this.db.destroy();
        this.db = null;
      }
      
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
      }
      
      logger.info('Database connections closed successfully');
    } catch (error) {
      logger.error('Error closing database connections:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const databaseConfig = DatabaseConfig.getInstance();
