import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '../config/logger';

/**
 * Validation middleware factory using Joi schemas
 * Provides comprehensive request validation with detailed error messages
 */
export const validateRequest = (schema: {
  body?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    // Validate request body
    if (schema.body) {
      const { error } = schema.body.validate(req.body);
      if (error) {
        errors.push(...error.details.map(detail => `Body: ${detail.message}`));
      }
    }

    // Validate request parameters
    if (schema.params) {
      const { error } = schema.params.validate(req.params);
      if (error) {
        errors.push(...error.details.map(detail => `Params: ${detail.message}`));
      }
    }

    // Validate query parameters
    if (schema.query) {
      const { error } = schema.query.validate(req.query);
      if (error) {
        errors.push(...error.details.map(detail => `Query: ${detail.message}`));
      }
    }

    if (errors.length > 0) {
      logger.warn('Request validation failed', {
        errors,
        path: req.path,
        method: req.method,
        requestId: (req as any).requestId,
      });

      res.status(400).json({
        error: 'ValidationError',
        message: 'Request validation failed',
        details: errors,
        timestamp: new Date().toISOString(),
        path: req.path,
      });
      return;
    }

    next();
  };
};

/**
 * Joi schemas for request validation
 */
export const schemas = {
  createRecord: {
    body: Joi.object({
      version: Joi.string().required().min(1).max(50)
        .description('Version of the record format'),
      
      kind: Joi.string().valid('RecordLinkage', 'ProcessEventSet').required()
        .description('Type of record being created'),
      
      system_id: Joi.string().required().min(1).max(100)
        .description('Identifier of the system creating the record'),
      
      record_id: Joi.string().required().min(1).max(100)
        .description('Unique identifier for the record within the system'),
      
      record_kind: Joi.string().valid('Permit', 'Project', 'Submission', 'Tracking').required()
        .description('Category of the record'),
      
      process_event: Joi.object().required()
        .description('JSON object containing the process event data')
        .min(1), // Ensure the object is not empty
    }).options({ stripUnknown: true }),
  },

  // Health check parameters (if any query params are added later)
  healthCheck: {
    query: Joi.object({
      detailed: Joi.boolean().optional()
        .description('Include detailed health information'),
    }).options({ stripUnknown: true }),
  },
};
