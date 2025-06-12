import { v4 as uuidv4 } from 'uuid';
import { databaseConfig } from '../config/database';
import { logger } from '../config/logger';
import { 
  Record, 
  NewRecord, 
  CreateRecordRequest, 
  CreateRecordResponse 
} from '../types/database';

/**
 * Service class for record operations with comprehensive error handling
 * Implements Azure best practices for database operations
 */
export class RecordService {
  /**
   * Create a new record in the database
   * Implements proper transaction handling and error recovery
   */
  public async createRecord(request: CreateRecordRequest): Promise<CreateRecordResponse> {
    const db = databaseConfig.getDatabase();
    const tx_id = uuidv4();
    
    try {
      logger.info('Creating new record', {
        tx_id,
        system_id: request.system_id,
        record_id: request.record_id,
        record_kind: request.record_kind,
      });

      // Prepare record data for insertion
      const newRecord: NewRecord = {
        tx_id,
        version: request.version,
        kind: request.kind,
        system_id: request.system_id,
        record_id: request.record_id,
        record_kind: request.record_kind,
        process_event: JSON.stringify(request.process_event), // Convert to JSON string for JSONB
      };

      // Execute database insertion with retry logic
      const insertedRecord = await this.executeWithRetry(async () => {
        return await db
          .insertInto('record')
          .values(newRecord)
          .returningAll()
          .executeTakeFirstOrThrow();
      });

      logger.info('Record created successfully', {
        tx_id,
        system_id: request.system_id,
        record_id: request.record_id,
      });

      // Format response
      const response: CreateRecordResponse = {
        tx_id: insertedRecord.tx_id,
        version: insertedRecord.version,
        kind: insertedRecord.kind,
        system_id: insertedRecord.system_id,
        record_id: insertedRecord.record_id,
        record_kind: insertedRecord.record_kind,
        process_event: typeof insertedRecord.process_event === 'string' 
          ? JSON.parse(insertedRecord.process_event) 
          : insertedRecord.process_event,
        created_at: new Date().toISOString(),
      };

      return response;

    } catch (error) {
      logger.error('Failed to create record', {
        tx_id,
        error: error instanceof Error ? error.message : String(error),
        system_id: request.system_id,
        record_id: request.record_id,
      });

      // Re-throw with more context
      if (error instanceof Error) {
        if (error.message.includes('duplicate key')) {
          throw new Error(`Record with tx_id ${tx_id} already exists`);
        }
        if (error.message.includes('foreign key')) {
          throw new Error('Invalid reference in record data');
        }
        if (error.message.includes('check constraint')) {
          throw new Error('Invalid enum value in record data');
        }
      }

      throw new Error(`Database operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get record by transaction ID
   */
  public async getRecordByTxId(tx_id: string): Promise<Record | null> {
    const db = databaseConfig.getDatabase();
    
    try {
      logger.debug('Fetching record by tx_id', { tx_id });

      const record = await this.executeWithRetry(async () => {
        return await db
          .selectFrom('record')
          .selectAll()
          .where('tx_id', '=', tx_id)
          .executeTakeFirst();
      });

      if (!record) {
        logger.debug('Record not found', { tx_id });
        return null;
      }

      // Parse JSONB field
      const parsedRecord: Record = {
        ...record,
        process_event: typeof record.process_event === 'string' 
          ? JSON.parse(record.process_event) 
          : record.process_event,
      };

      logger.debug('Record retrieved successfully', { tx_id });
      return parsedRecord;

    } catch (error) {
      logger.error('Failed to retrieve record', {
        tx_id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Failed to retrieve record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get records by system and record ID
   */
  public async getRecordsBySystemAndRecordId(
    system_id: string, 
    record_id: string
  ): Promise<Record[]> {
    const db = databaseConfig.getDatabase();
    
    try {
      logger.debug('Fetching records by system_id and record_id', { system_id, record_id });

      const records = await this.executeWithRetry(async () => {
        return await db
          .selectFrom('record')
          .selectAll()
          .where('system_id', '=', system_id)
          .where('record_id', '=', record_id)
          .orderBy('tx_id', 'desc')
          .execute();
      });

      // Parse JSONB fields
      const parsedRecords: Record[] = records.map(record => ({
        ...record,
        process_event: typeof record.process_event === 'string' 
          ? JSON.parse(record.process_event) 
          : record.process_event,
      }));

      logger.debug('Records retrieved successfully', { 
        system_id, 
        record_id, 
        count: parsedRecords.length 
      });

      return parsedRecords;

    } catch (error) {
      logger.error('Failed to retrieve records', {
        system_id,
        record_id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Failed to retrieve records: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute database operation with retry logic for transient failures
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Check if error is transient (connection issues, timeouts, etc.)
        const isTransientError = this.isTransientError(lastError);
        
        if (!isTransientError || attempt === maxRetries) {
          throw lastError;
        }

        // Exponential backoff
        const delay = Math.pow(2, attempt - 1) * 1000;
        logger.warn(`Database operation failed, retrying in ${delay}ms`, {
          attempt,
          maxRetries,
          error: lastError.message,
        });

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * Check if an error is transient and worth retrying
   */
  private isTransientError(error: Error): boolean {
    const transientErrorCodes = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'connection terminated',
      'server closed the connection',
      'timeout',
    ];

    return transientErrorCodes.some(code => 
      error.message.toLowerCase().includes(code.toLowerCase())
    );
  }
}

// Export singleton instance
export const recordService = new RecordService();
