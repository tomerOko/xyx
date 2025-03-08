import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ErrorResponse } from '../types';

export class ApiError extends Error {
  status: number;
  
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const status = (err as ApiError).status || 500;
  const message = err.message || 'Internal Server Error';
  
  const errorResponse: ErrorResponse = {
    message,
    status,
    timestamp: new Date().toISOString(),
    path: req.path,
  };
  
  logger.error(`Error: ${message} - Path: ${req.path} - Status: ${status}`);
  
  if (status === 500) {
    logger.error(err.stack);
  }
  
  res.status(status).json({ error: errorResponse });
};
