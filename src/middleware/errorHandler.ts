import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import {
  AuthError,
  isAuthError,
  getErrorSeverity,
  ErrorSeverity,
} from "../errors/AuthErrors";
import { formatZodError } from "../validation/schemas";

// Error response interface
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    timestamp: string;
    requestId?: string;
    details?: any;
    retryAfter?: number;
  };
}

// Generate unique request ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// Sanitize error message to prevent information leakage
function sanitizeErrorMessage(error: Error, isDevelopment: boolean): string {
  if (isDevelopment) {
    return error.message;
  }

  // In production, return generic messages for certain error types
  if (
    error.message.includes("database") ||
    error.message.includes("connection")
  ) {
    return "A database error occurred";
  }

  if (error.message.includes("internal") || error.message.includes("server")) {
    return "An internal server error occurred";
  }

  return error.message;
}

// Log error with appropriate level
function logError(error: Error, req: Request, requestId: string) {
  const logData = {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get("User-Agent"),
    ip: req.ip,
    userId: (req as any).user?.id,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    timestamp: new Date().toISOString(),
  };

  if (isAuthError(error)) {
    const severity = getErrorSeverity(error);

    switch (severity) {
      case ErrorSeverity.CRITICAL:
        console.error("CRITICAL ERROR:", JSON.stringify(logData, null, 2));
        break;
      case ErrorSeverity.HIGH:
        console.error("HIGH SEVERITY ERROR:", JSON.stringify(logData, null, 2));
        break;
      case ErrorSeverity.MEDIUM:
        console.warn(
          "MEDIUM SEVERITY ERROR:",
          JSON.stringify(logData, null, 2)
        );
        break;
      case ErrorSeverity.LOW:
        console.log("LOW SEVERITY ERROR:", JSON.stringify(logData, null, 2));
        break;
    }
  } else {
    console.error("UNHANDLED ERROR:", JSON.stringify(logData, null, 2));
  }
}

// Main error handling middleware
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = generateRequestId();
  const isDevelopment = process.env.NODE_ENV === "development";

  // Log the error
  logError(error, req, requestId);

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const errorResponse: ErrorResponse = {
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        timestamp: new Date().toISOString(),
        requestId,
        details: formatZodError(error),
      },
    };

    res.status(400).json(errorResponse);
    return;
  }

  // Handle custom authentication errors
  if (isAuthError(error)) {
    const errorResponse: ErrorResponse = {
      error: {
        code: error.code,
        message: sanitizeErrorMessage(error, isDevelopment),
        timestamp: new Date().toISOString(),
        requestId,
        details: isDevelopment ? error.details : undefined,
      },
    };

    // Add retryAfter for rate limiting errors
    if ("retryAfter" in error && typeof error.retryAfter === "number") {
      errorResponse.error.retryAfter = error.retryAfter;
    }

    res.status(error.statusCode).json(errorResponse);
    return;
  }

  // Handle Prisma errors
  if (error.name === "PrismaClientKnownRequestError") {
    const prismaError = error as any;

    switch (prismaError.code) {
      case "P2002":
        res.status(409).json({
          error: {
            code: "DUPLICATE_ENTRY",
            message: "A record with this information already exists",
            timestamp: new Date().toISOString(),
            requestId,
          },
        });
        return;
      case "P2025":
        res.status(404).json({
          error: {
            code: "RECORD_NOT_FOUND",
            message: "The requested record was not found",
            timestamp: new Date().toISOString(),
            requestId,
          },
        });
        return;
      default:
        res.status(500).json({
          error: {
            code: "DATABASE_ERROR",
            message: "A database error occurred",
            timestamp: new Date().toISOString(),
            requestId,
          },
        });
        return;
    }
  }

  // Handle JWT errors
  if (error.name === "JsonWebTokenError") {
    res.status(401).json({
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid authentication token",
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
    return;
  }

  if (error.name === "TokenExpiredError") {
    res.status(401).json({
      error: {
        code: "TOKEN_EXPIRED",
        message: "Authentication token has expired",
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
    return;
  }

  // Handle bcrypt errors
  if (error.message.includes("bcrypt")) {
    res.status(500).json({
      error: {
        code: "ENCRYPTION_ERROR",
        message: "Password processing error",
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
    return;
  }

  // Handle generic errors
  const statusCode = (error as any).statusCode || (error as any).status || 500;
  const errorResponse: ErrorResponse = {
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: isDevelopment ? error.message : "An unexpected error occurred",
      timestamp: new Date().toISOString(),
      requestId,
      details: isDevelopment ? { stack: error.stack } : undefined,
    },
  };

  res.status(statusCode).json(errorResponse);
}

// 404 handler for unmatched routes
export function notFoundHandler(req: Request, res: Response): void {
  const requestId = generateRequestId();

  res.status(404).json({
    error: {
      code: "ROUTE_NOT_FOUND",
      message: `Route ${req.method} ${req.path} not found`,
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

// Async error wrapper
export function asyncHandler<T extends Request, U extends Response>(
  fn: (req: T, res: U, next: NextFunction) => Promise<any>
) {
  return (req: T, res: U, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Error boundary for critical sections
export function withErrorBoundary<T>(
  operation: () => Promise<T>,
  fallback?: T,
  errorMessage?: string
): Promise<T> {
  return operation().catch((error) => {
    console.error(
      `Error boundary caught: ${errorMessage || "Unknown operation"}`,
      error
    );

    if (fallback !== undefined) {
      return fallback;
    }

    throw error;
  });
}

// Graceful shutdown handler
export function setupGracefulShutdown(server: any) {
  const shutdown = (signal: string) => {
    console.log(`Received ${signal}. Starting graceful shutdown...`);

    server.close((err: any) => {
      if (err) {
        console.error("Error during server shutdown:", err);
        process.exit(1);
      }

      console.log("Server closed successfully");
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      console.error("Forced shutdown after timeout");
      process.exit(1);
    }, 30000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
    // Don't exit the process, just log the error
  });

  process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    // Exit the process for uncaught exceptions
    process.exit(1);
  });
}

// Health check endpoint helper
export function createHealthCheck() {
  return (_req: Request, res: Response) => {
    const healthData = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version || "1.0.0",
    };

    res.json(healthData);
  };
}

// Request timeout handler
export function requestTimeout(timeoutMs: number = 30000) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          error: {
            code: "REQUEST_TIMEOUT",
            message: "Request timeout",
            timestamp: new Date().toISOString(),
          },
        });
      }
    }, timeoutMs);

    res.on("finish", () => {
      clearTimeout(timeout);
    });

    next();
  };
}
