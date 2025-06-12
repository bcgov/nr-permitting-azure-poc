import { Router } from 'express';
import { recordController } from '../controllers/recordController';
import { validateRequest, schemas } from '../middleware/validation';

/**
 * Record routes with validation middleware
 * Implements RESTful API patterns for record management
 */
const router = Router();

/**
 * POST /records - Create a new record
 * Validates request body against schema before processing
 */
router.post(
  '/',
  validateRequest(schemas.createRecord),
  recordController.createRecord
);

/**
 * GET /records/:tx_id - Get record by transaction ID
 * Includes parameter validation for UUID format
 */
router.get(
  '/:tx_id',
  recordController.getRecord
);

export { router as recordRoutes };
