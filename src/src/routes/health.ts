import { Router } from 'express';
import { healthController } from '../controllers/healthController';
import { validateRequest, schemas } from '../middleware/validation';

/**
 * Health check routes for monitoring and probes
 */
const router = Router();

/**
 * GET /health - Comprehensive health check
 */
router.get(
  '/',
  validateRequest(schemas.healthCheck),
  healthController.healthCheck
);

/**
 * GET /liveness - Kubernetes liveness probe
 */
router.get(
  '/liveness',
  healthController.livenessProbe
);

/**
 * GET /readiness - Kubernetes readiness probe
 */
router.get(
  '/readiness',
  healthController.readinessProbe
);

/**
 * Alternative health endpoints for different monitoring systems
 */
router.get('/live', healthController.livenessProbe);
router.get('/ready', healthController.readinessProbe);

export { router as healthRoutes };
