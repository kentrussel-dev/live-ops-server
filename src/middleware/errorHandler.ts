import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const errorCode = err.code || (statusCode === 500 ? 'ERR_INTERNAL_SERVER' : 'ERR_BAD_REQUEST');

  console.error(`[Error] [${req.method} ${req.originalUrl}] [${errorCode} - ${statusCode}]:`, err.message);
  if (statusCode === 500 && process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: err.message || 'An unexpected operational error occurred.',
      details: err.details,
    },
  });
}
