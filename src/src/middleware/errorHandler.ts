import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { ApiError } from '../types/database';

/**
 * Global error handler middleware
 * Provides consistent error responses and proper logging
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = (req as any).requestId || 'unknown';
  
  // Log the error with context
  logger.error('Unhandled error occurred', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    requestId,
    body: req.body,
    params: req.params,
    query: req.query,
  });

  // Determine error type and status code
  let statusCode = 500;
  let errorType = 'InternalServerError';
  let message = 'An unexpected error occurred';

  if (error.name === 'ValidationError') {
    statusCode = 400;
    errorType = 'ValidationError';
    message = error.message;
  } else if (error.name === 'UnauthorizedError') {
    statusCode = 401;
    errorType = 'UnauthorizedError';
    message = 'Authentication required';
  } else if (error.name === 'ForbiddenError') {
    statusCode = 403;
    errorType = 'ForbiddenError';
    message = 'Access denied';
  } else if (error.name === 'NotFoundError') {
    statusCode = 404;
    errorType = 'NotFoundError';
    message = 'Resource not found';
  } else if (error.message.includes('Database')) {
    statusCode = 503;
    errorType = 'ServiceUnavailableError';
    message = 'Database service temporarily unavailable';
  }

  // Create error response
  const errorResponse: ApiError = {
    error: errorType,
    message,
    timestamp: new Date().toISOString(),
    path: req.path,
    ...(process.env.NODE_ENV === 'development' && {
      details: {
        stack: error.stack,
        originalMessage: error.message,
      },
    }),
  };

  res.status(statusCode).json(errorResponse);
};

/**
 * 404 Not Found handler for undefined routes
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  const requestId = (req as any).requestId || 'unknown';
  
  logger.warn('Route not found', {
    path: req.path,
    method: req.method,
    requestId,
  });

  const errorResponse: ApiError = {
    error: 'NotFoundError',
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
    path: req.path,
  };

  res.status(404).json(errorResponse);
};

/**
 * Async error wrapper for route handlers
 * Automatically catches async errors and passes them to the error handler
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
