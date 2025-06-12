import { Request, Response } from 'express';
import { recordService } from '../services/recordService';
import { logger } from '../config/logger';
import { CreateRecordRequest } from '../types/database';
import { asyncHandler } from '../middleware/errorHandler';

/**
 * @swagger
 * components:
 *   parameters:
 *     SubscriptionKey:
 *       name: Ocp-Apim-Subscription-Key
 *       in: header
 *       required: true
 *       schema:
 *         type: string
 *       description: Azure API Management subscription key
 */

/**
 * Record controller with comprehensive OpenAPI documentation
 * Implements Azure API Management best practices
 */
export class RecordController {
  /**
   * @swagger
   * /records:
   *   post:
   *     summary: Create a new record
   *     description: Creates a new record in the Natural Resources Permitting system. This operation stores process event data for permits, projects, submissions, or tracking records.
   *     tags:
   *       - Records
   *     parameters:
   *       - $ref: '#/components/parameters/SubscriptionKey'
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateRecordRequest'
   *           examples:
   *             permitApplication:
   *               summary: Permit Application Record
   *               description: Example of a permit application process event
   *               value:
   *                 version: "1.0.0"
   *                 kind: "ProcessEventSet"
   *                 system_id: "nr-permits-system"
   *                 record_id: "PERMIT-2024-001"
   *                 record_kind: "Permit"
   *                 process_event:
   *                   event_type: "application_submitted"
   *                   timestamp: "2024-01-15T10:30:00Z"
   *                   applicant_id: "APP-12345"
   *                   permit_type: "timber_harvest"
   *                   location:
   *                     latitude: 54.7267
   *                     longitude: -127.7476
   *                   area_hectares: 150.5
   *                   estimated_volume_m3: 2500
   *             projectTracking:
   *               summary: Project Tracking Record
   *               description: Example of a project tracking process event
   *               value:
   *                 version: "1.0.0"
   *                 kind: "RecordLinkage"
   *                 system_id: "nr-projects-system"
   *                 record_id: "PROJ-2024-042"
   *                 record_kind: "Project"
   *                 process_event:
   *                   event_type: "milestone_completed"
   *                   timestamp: "2024-01-15T14:20:00Z"
   *                   project_phase: "environmental_assessment"
   *                   completion_percentage: 75
   *                   next_milestone: "public_consultation"
   *                   responsible_officer: "officer_456"
   *     responses:
   *       201:
   *         description: Record created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/CreateRecordResponse'
   *             example:
   *               tx_id: "123e4567-e89b-12d3-a456-426614174000"
   *               version: "1.0.0"
   *               kind: "ProcessEventSet"
   *               system_id: "nr-permits-system"
   *               record_id: "PERMIT-2024-001"
   *               record_kind: "Permit"
   *               process_event:
   *                 event_type: "application_submitted"
   *                 timestamp: "2024-01-15T10:30:00Z"
   *                 applicant_id: "APP-12345"
   *                 permit_type: "timber_harvest"
   *               created_at: "2024-01-15T10:30:00.123Z"
   *       400:
   *         description: Invalid request data
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiError'
   *             example:
   *               error: "ValidationError"
   *               message: "Request validation failed"
   *               details: ["Body: 'kind' must be one of [RecordLinkage, ProcessEventSet]"]
   *               timestamp: "2024-01-15T10:30:00.123Z"
   *               path: "/api/v1/records"
   *       401:
   *         description: Authentication required
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiError'
   *       403:
   *         description: Access denied - insufficient permissions
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiError'
   *       429:
   *         description: Rate limit exceeded
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiError'
   *       500:
   *         description: Internal server error
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiError'
   *       503:
   *         description: Service temporarily unavailable
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiError'
   *     x-azure-apim:
   *       policies:
   *         - rate-limit: 100 per hour
   *         - quota: 1000 per month
   *         - validate-jwt: true
   */
  public createRecord = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const requestId = (req as any).requestId || 'unknown';
    const request: CreateRecordRequest = req.body;

    logger.info('Creating new record', {
      requestId,
      system_id: request.system_id,
      record_id: request.record_id,
      record_kind: request.record_kind,
      kind: request.kind,
    });

    try {
      // Create the record using the service
      const result = await recordService.createRecord(request);

      logger.info('Record created successfully', {
        requestId,
        tx_id: result.tx_id,
        system_id: request.system_id,
        record_id: request.record_id,
      });

      // Return success response
      res.status(201).json(result);

    } catch (error) {
      logger.error('Failed to create record', {
        requestId,
        error: error instanceof Error ? error.message : String(error),
        system_id: request.system_id,
        record_id: request.record_id,
      });

      // Let the error handler middleware handle this
      throw error;
    }
  });

  /**
   * @swagger
   * /records/{tx_id}:
   *   get:
   *     summary: Get record by transaction ID
   *     description: Retrieves a specific record using its unique transaction identifier
   *     tags:
   *       - Records
   *     parameters:
   *       - $ref: '#/components/parameters/SubscriptionKey'
   *       - name: tx_id
   *         in: path
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Unique transaction identifier
   *         example: "123e4567-e89b-12d3-a456-426614174000"
   *     responses:
   *       200:
   *         description: Record found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/CreateRecordResponse'
   *       404:
   *         description: Record not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiError'
   *       401:
   *         description: Authentication required
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ApiError'
   */
  public getRecord = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const requestId = (req as any).requestId || 'unknown';
    const { tx_id } = req.params;

    if (!tx_id) {
      res.status(400).json({
        error: 'ValidationError',
        message: 'Transaction ID is required',
        timestamp: new Date().toISOString(),
        path: req.path,
      });
      return;
    }

    logger.info('Fetching record by tx_id', {
      requestId,
      tx_id,
    });

    try {
      const record = await recordService.getRecordByTxId(tx_id);

      if (!record) {
        logger.info('Record not found', {
          requestId,
          tx_id,
        });

        res.status(404).json({
          error: 'NotFoundError',
          message: `Record with tx_id ${tx_id} not found`,
          timestamp: new Date().toISOString(),
          path: req.path,
        });
        return;
      }

      logger.info('Record retrieved successfully', {
        requestId,
        tx_id,
        record_id: record.record_id,
        system_id: record.system_id,
      });

      res.status(200).json({
        ...record,
        created_at: new Date().toISOString(), // Add created_at for consistency
      });

    } catch (error) {
      logger.error('Failed to retrieve record', {
        requestId,
        tx_id,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  });
}

// Export controller instance
export const recordController = new RecordController();
