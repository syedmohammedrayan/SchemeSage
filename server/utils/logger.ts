import winston from 'winston';

const { combine, timestamp, errors, colorize, printf, json } = winston.format;

const isDevelopment = process.env.NODE_ENV !== 'production';

// Custom console format for development readability
const devFormat = printf(({ level, message, timestamp, requestId, ...meta }) => {
  const reqId = requestId ? ` [${requestId}]` : '';
  const metaStr = Object.keys(meta).length ? `\n  ${JSON.stringify(meta, null, 2)}` : '';
  return `${timestamp}${reqId} [${level}]: ${message}${metaStr}`;
});

export const logger = winston.createLogger({
  level: isDevelopment ? 'debug' : 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    isDevelopment ? combine(colorize(), devFormat) : json()
  ),
  transports: [
    new winston.transports.Console(),
    // In production, add file transport or cloud logging transport here
    ...(isDevelopment
      ? []
      : [
          new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
          new winston.transports.File({ filename: 'logs/combined.log' }),
        ]),
  ],
  // Don't crash on unhandled exceptions
  exceptionHandlers: [new winston.transports.Console()],
  rejectionHandlers: [new winston.transports.Console()],
});

// ─── Request Logger Middleware ────────────────────────────────────────────────
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = crypto.randomUUID().substring(0, 8);
  const start = Date.now();

  // Attach requestId to request object for use in route handlers
  (req as any).requestId = requestId;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = {
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    };

    if (res.statusCode >= 500) {
      logger.error('Request completed with server error', log);
    } else if (res.statusCode >= 400) {
      logger.warn('Request completed with client error', log);
    } else {
      logger.info('Request completed', log);
    }
  });

  next();
}
