import { RecordService } from '../services/recordService';
import { CreateRecordRequest } from '../types/database';

// Mock the database config
jest.mock('../config/database', () => ({
  databaseConfig: {
    getDatabase: jest.fn(() => ({
      insertInto: jest.fn(() => ({
        values: jest.fn(() => ({
          returningAll: jest.fn(() => ({
            executeTakeFirstOrThrow: jest.fn(),
          })),
        })),
      })),
      selectFrom: jest.fn(() => ({
        selectAll: jest.fn(() => ({
          where: jest.fn(() => ({
            executeTakeFirst: jest.fn(),
          })),
        })),
      })),
    })),
  },
}));

jest.mock('../config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('RecordService', () => {
  let recordService: RecordService;

  beforeEach(() => {
    recordService = new RecordService();
    jest.clearAllMocks();
  });

  describe('createRecord', () => {
    it('should create a record successfully', async () => {
      const mockRequest: CreateRecordRequest = {
        version: '1.0.0',
        kind: 'ProcessEventSet',
        system_id: 'test-system',
        record_id: 'test-record-001',
        record_kind: 'Permit',
        process_event: {
          event_type: 'application_submitted',
          timestamp: '2024-01-15T10:30:00Z',
          applicant_id: 'APP-12345',
        },
      };

      const mockDbResponse = {
        tx_id: '123e4567-e89b-12d3-a456-426614174000',
        version: '1.0.0',
        kind: 'ProcessEventSet',
        system_id: 'test-system',
        record_id: 'test-record-001',
        record_kind: 'Permit',
        process_event: JSON.stringify(mockRequest.process_event),
      };

      const { databaseConfig } = require('../config/database');
      const mockDb = databaseConfig.getDatabase();
      
      mockDb.insertInto().values().returningAll().executeTakeFirstOrThrow
        .mockResolvedValue(mockDbResponse);

      const result = await recordService.createRecord(mockRequest);

      expect(result).toEqual({
        tx_id: mockDbResponse.tx_id,
        version: mockDbResponse.version,
        kind: mockDbResponse.kind,
        system_id: mockDbResponse.system_id,
        record_id: mockDbResponse.record_id,
        record_kind: mockDbResponse.record_kind,
        process_event: mockRequest.process_event,
        created_at: expect.any(String),
      });
    });

    it('should handle database errors', async () => {
      const mockRequest: CreateRecordRequest = {
        version: '1.0.0',
        kind: 'ProcessEventSet',
        system_id: 'test-system',
        record_id: 'test-record-001',
        record_kind: 'Permit',
        process_event: {},
      };

      const { databaseConfig } = require('../config/database');
      const mockDb = databaseConfig.getDatabase();
      
      mockDb.insertInto().values().returningAll().executeTakeFirstOrThrow
        .mockRejectedValue(new Error('Database connection failed'));

      await expect(recordService.createRecord(mockRequest))
        .rejects.toThrow('Database operation failed');
    });
  });

  describe('getRecordByTxId', () => {
    it('should retrieve a record by tx_id', async () => {
      const txId = '123e4567-e89b-12d3-a456-426614174000';
      const mockDbResponse = {
        tx_id: txId,
        version: '1.0.0',
        kind: 'ProcessEventSet',
        system_id: 'test-system',
        record_id: 'test-record-001',
        record_kind: 'Permit',
        process_event: JSON.stringify({ event_type: 'test' }),
      };

      const { databaseConfig } = require('../config/database');
      const mockDb = databaseConfig.getDatabase();
      
      mockDb.selectFrom().selectAll().where().executeTakeFirst
        .mockResolvedValue(mockDbResponse);

      const result = await recordService.getRecordByTxId(txId);

      expect(result).toEqual({
        ...mockDbResponse,
        process_event: { event_type: 'test' },
      });
    });

    it('should return null when record not found', async () => {
      const txId = '123e4567-e89b-12d3-a456-426614174000';

      const { databaseConfig } = require('../config/database');
      const mockDb = databaseConfig.getDatabase();
      
      mockDb.selectFrom().selectAll().where().executeTakeFirst
        .mockResolvedValue(undefined);

      const result = await recordService.getRecordByTxId(txId);

      expect(result).toBeNull();
    });
  });
});
