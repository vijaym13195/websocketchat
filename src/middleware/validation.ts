import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { formatZodError } from "../validation/schemas";

// Validation middleware factory
export function validateRequest(schema: {
  body?: z.ZodSchema;
  params?: z.ZodSchema;
  query?: z.ZodSchema;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      if (schema.body) {
        const bodyResult = schema.body.safeParse(req.body);
        if (!bodyResult.success) {
          return res.status(400).json({
            error: {
              code: "VALIDATION_ERROR",
              message: "Request body validation failed",
              details: formatZodError(bodyResult.error),
            },
          });
        }
        req.body = bodyResult.data;
      }

      // Validate request parameters
      if (schema.params) {
        const paramsResult = schema.params.safeParse(req.params);
        if (!paramsResult.success) {
          return res.status(400).json({
            error: {
              code: "VALIDATION_ERROR",
              message: "Request parameters validation failed",
              details: formatZodError(paramsResult.error),
            },
          });
        }
        req.params = paramsResult.data as any;
      }

      // Validate query parameters
      if (schema.query) {
        const queryResult = schema.query.safeParse(req.query);
        if (!queryResult.success) {
          return res.status(400).json({
            error: {
              code: "VALIDATION_ERROR",
              message: "Query parameters validation failed",
              details: formatZodError(queryResult.error),
            },
          });
        }
        req.query = queryResult.data as any;
      }

      next();
    } catch (error) {
      return res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message: "Validation middleware error",
        },
      });
    }
  };
}

// Specific validation middlewares for common use cases
export const validateBody = (schema: z.ZodSchema) =>
  validateRequest({ body: schema });
export const validateParams = (schema: z.ZodSchema) =>
  validateRequest({ params: schema });
export const validateQuery = (schema: z.ZodSchema) =>
  validateRequest({ query: schema });

// Input sanitization middleware
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  // Sanitize body
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === "object") {
    req.query = sanitizeObject(req.query);
  }

  next();
}

function sanitizeObject(obj: any): any {
  if (typeof obj === "string") {
    return obj.trim().replace(/[<>]/g, "");
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (obj && typeof obj === "object") {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

// Request size limit middleware
export function limitRequestSize(maxSize: string = "10mb") {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.get("content-length");

    if (contentLength) {
      const sizeInBytes = parseInt(contentLength, 10);
      const maxSizeInBytes = parseSize(maxSize);

      if (sizeInBytes > maxSizeInBytes) {
        return res.status(413).json({
          error: {
            code: "PAYLOAD_TOO_LARGE",
            message: `Request size exceeds limit of ${maxSize}`,
          },
        });
      }
    }

    next();
  };
}

function parseSize(size: string): number {
  const units: { [key: string]: number } = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };

  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)(b|kb|mb|gb)?$/);
  if (!match) {
    throw new Error("Invalid size format");
  }

  const value = parseFloat(match[1]);
  const unit = match[2] || "b";

  return Math.floor(value * units[unit]);
}

// Content type validation middleware
export function validateContentType(
  allowedTypes: string[] = ["application/json"]
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentType = req.get("content-type");

    if (req.method !== "GET" && req.method !== "DELETE") {
      if (
        !contentType ||
        !allowedTypes.some((type) => contentType.includes(type))
      ) {
        return res.status(415).json({
          error: {
            code: "UNSUPPORTED_MEDIA_TYPE",
            message: `Content-Type must be one of: ${allowedTypes.join(", ")}`,
          },
        });
      }
    }

    next();
  };
}

// Custom validation error class
export class ValidationError extends Error {
  public readonly code: string;
  public readonly details: any;

  constructor(message: string, details?: any) {
    super(message);
    this.name = "ValidationError";
    this.code = "VALIDATION_ERROR";
    this.details = details;
  }
}

// Async validation wrapper
export function asyncValidate<T>(validationFn: (data: any) => Promise<T>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await validationFn(req.body);
      req.body = result;
      next();
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
        });
      }
      next(error);
    }
  };
}
