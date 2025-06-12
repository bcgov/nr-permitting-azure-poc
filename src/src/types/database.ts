import { Generated, Insertable, Selectable, Updateable } from 'kysely';

/**
 * Database schema interface
 */
export interface Database {
  record: RecordTable;
}

/**
 * Record table interface matching the PostgreSQL schema
 */
export interface RecordTable {
  tx_id: Generated<string>; // UUID primary key
  version: string;
  kind: 'RecordLinkage' | 'ProcessEventSet';
  system_id: string;
  record_id: string;
  record_kind: 'Permit' | 'Project' | 'Submission' | 'Tracking';
  process_event: unknown; // JSONB field
}

/**
 * Type-safe record operations
 */
export type Record = Selectable<RecordTable>;
export type NewRecord = Insertable<RecordTable>;
export type RecordUpdate = Updateable<RecordTable>;

/**
 * Request/Response DTOs for API operations
 */
export interface CreateRecordRequest {
  version: string;
  kind: 'RecordLinkage' | 'ProcessEventSet';
  system_id: string;
  record_id: string;
  record_kind: 'Permit' | 'Project' | 'Submission' | 'Tracking';
  process_event: { [key: string]: any };
}

export interface CreateRecordResponse {
  tx_id: string;
  version: string;
  kind: string;
  system_id: string;
  record_id: string;
  record_kind: string;
  process_event: { [key: string]: any };
  created_at: string;
}

/**
 * API Error response interface
 */
export interface ApiError {
  error: string;
  message: string;
  details?: any;
  timestamp: string;
  path: string;
}

/**
 * Health check response interface
 */
export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  database: {
    connected: boolean;
    latency_ms?: number;
  };
  environment: string;
}
